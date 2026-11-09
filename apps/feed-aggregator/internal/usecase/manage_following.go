package usecase

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"sync"
	"uuid"

	lru "github.com/hashicorp/golang-lru/v2"
	"golang.org/x/sync/singleflight"

	"github.com/guihigashi/conduit/feed/internal/appctx"
)

type FollowingStore interface {
	GetFollowing(ctx context.Context, userId uuid.UUID) ([]uuid.UUID, int64, error)
}

type cachedFollowing struct {
	ids     []uuid.UUID
	version int64
}

// ManageFollowing keeps the set of users each logged-in user follows in memory along with their follows_version.
//
//   - Filled on demand from social-graph on a miss (or when cached version < minFollowsVersion), bounded by an LRU over users.
//   - Kept current by social.user-followed / social.user-unfollowed events (idempotent, monotonic version check).
//   - Cached slices are immutable (copy-on-write): readers need no lock and must not modify the result.
type ManageFollowing struct {
	store FollowingStore

	cache  *lru.Cache[uuid.UUID, cachedFollowing]
	flight singleflight.Group

	// mu serializes event application and load completion so an event arriving while a load is in flight
	// is never overwritten by a stale loaded snapshot.
	mu      sync.Mutex
	loading map[uuid.UUID]*loadState
}

type loadState struct {
	dirty bool // an event for this user arrived while loading
}

func NewManageFollowing(store FollowingStore, maxUsers int) (*ManageFollowing, error) {
	cache, err := lru.New[uuid.UUID, cachedFollowing](maxUsers)
	if err != nil {
		return nil, err
	}
	return &ManageFollowing{
		store:   store,
		cache:   cache,
		loading: make(map[uuid.UUID]*loadState),
	}, nil
}

// GetFollowing returns the ids followed by userId, ensuring the returned state is at least minVersion.
func (m *ManageFollowing) GetFollowing(ctx context.Context, userId uuid.UUID, minVersion int64) ([]uuid.UUID, error) {
	if entry, ok := m.cache.Get(userId); ok && entry.version >= minVersion {
		return entry.ids, nil
	}

	flightKey := userId.String()
	v, err, _ := m.flight.Do(flightKey, func() (any, error) {
		// Double check under flight
		if entry, ok := m.cache.Get(userId); ok && entry.version >= minVersion {
			return entry.ids, nil
		}

		loadCtx, cancel := context.WithTimeout(appctx.WithRequestorId(context.WithoutCancel(ctx), userId), loadTimeout)
		defer cancel()

		state := &loadState{}
		m.mu.Lock()
		m.loading[userId] = state
		m.mu.Unlock()

		ids, version, err := m.store.GetFollowing(loadCtx, userId)

		m.mu.Lock()
		defer m.mu.Unlock()
		delete(m.loading, userId)
		if err != nil {
			return nil, err
		}
		if ids == nil {
			ids = []uuid.UUID{}
		}

		// Only overwrite cache if no newer event arrived while loading and current cache is not already ahead
		current, exists := m.cache.Peek(userId)
		if !state.dirty && (!exists || version >= current.version) {
			m.cache.Add(userId, cachedFollowing{ids: ids, version: version})
		}
		return ids, nil
	})
	if err != nil {
		return nil, err
	}
	return v.([]uuid.UUID), nil
}

type followEvent struct {
	Payload struct {
		FollowerId uuid.UUID `json:"followerId"`
		FollowedId uuid.UUID `json:"followedId"`
		Version    int64     `json:"version"`
	} `json:"payload"`
}

// HandleSocialEvent applies follow and unfollow events to the cached sets.
func (m *ManageFollowing) HandleSocialEvent(routingKey string, body []byte) {
	if routingKey != "social.user-followed" && routingKey != "social.user-unfollowed" {
		return
	}

	var event followEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("failed to unmarshal social event for following", slog.String("routing_key", routingKey), slog.Any("error", err))
		return
	}
	follower, followed, version := event.Payload.FollowerId, event.Payload.FollowedId, event.Payload.Version

	m.mu.Lock()
	defer m.mu.Unlock()

	if state, ok := m.loading[follower]; ok {
		state.dirty = true
	}

	current, ok := m.cache.Peek(follower)
	if !ok {
		return
	}

	if version > 0 && current.version >= version {
		slog.Debug("ignoring older or duplicate social event", slog.Int64("current_version", current.version), slog.Int64("event_version", version))
		return
	}

	newVersion := version
	if newVersion <= current.version {
		newVersion = current.version + 1
	}

	switch routingKey {
	case "social.user-followed":
		if slices.Contains(current.ids, followed) {
			m.cache.Add(follower, cachedFollowing{ids: current.ids, version: newVersion})
			return
		}
		next := make([]uuid.UUID, len(current.ids), len(current.ids)+1)
		copy(next, current.ids)
		m.cache.Add(follower, cachedFollowing{ids: append(next, followed), version: newVersion})
	case "social.user-unfollowed":
		idx := slices.Index(current.ids, followed)
		if idx < 0 {
			m.cache.Add(follower, cachedFollowing{ids: current.ids, version: newVersion})
			return
		}
		next := make([]uuid.UUID, 0, len(current.ids)-1)
		next = append(next, current.ids[:idx]...)
		next = append(next, current.ids[idx+1:]...)
		m.cache.Add(follower, cachedFollowing{ids: next, version: newVersion})
	}

	slog.Debug("following updated from social event", slog.String("routing_key", routingKey), slog.Int64("version", newVersion))
}
