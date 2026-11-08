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
)

type FollowingStore interface {
	GetFollowing(ctx context.Context, userId uuid.UUID) ([]uuid.UUID, error)
}

// ManageFollowing keeps the set of users each logged-in user follows in memory.
//
//   - Filled on demand from social-graph on a miss, bounded by an LRU over users.
//   - Kept current by social.user_followed / social.user_unfollowed events (idempotent, so redelivery is harmless).
//   - Cached slices are immutable (copy-on-write): readers need no lock and must not modify the result.
//
// Events for users that are not cached are ignored: the next miss reads the current state from social-graph.
type ManageFollowing struct {
	store FollowingStore

	cache  *lru.Cache[uuid.UUID, []uuid.UUID]
	flight singleflight.Group

	// mu serializes event application and load completion so an event arriving while a load is in flight
	// is never overwritten by the (possibly older) loaded snapshot.
	mu      sync.Mutex
	loading map[uuid.UUID]*loadState
}

type loadState struct {
	dirty bool // an event for this user arrived while loading
}

func NewManageFollowing(store FollowingStore, maxUsers int) (*ManageFollowing, error) {
	cache, err := lru.New[uuid.UUID, []uuid.UUID](maxUsers)
	if err != nil {
		return nil, err
	}
	return &ManageFollowing{
		store:   store,
		cache:   cache,
		loading: make(map[uuid.UUID]*loadState),
	}, nil
}

// GetFollowing returns the ids followed by userId. The returned slice is shared and must not be modified.
func (m *ManageFollowing) GetFollowing(ctx context.Context, userId uuid.UUID) ([]uuid.UUID, error) {
	if ids, ok := m.cache.Get(userId); ok {
		return ids, nil
	}

	v, err, _ := m.flight.Do(userId.String(), func() (any, error) {
		// Shared among callers for the same user: keep ctx values (requestor id) but not the first caller's cancellation.
		loadCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), loadTimeout)
		defer cancel()

		state := &loadState{}
		m.mu.Lock()
		m.loading[userId] = state
		m.mu.Unlock()

		ids, err := m.store.GetFollowing(loadCtx, userId)

		m.mu.Lock()
		defer m.mu.Unlock()
		delete(m.loading, userId)
		if err != nil {
			return nil, err
		}
		if ids == nil {
			ids = []uuid.UUID{}
		}
		if !state.dirty {
			m.cache.Add(userId, ids)
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
	} `json:"payload"`
}

// HandleSocialEvent applies follow and unfollow events to the cached sets.
func (m *ManageFollowing) HandleSocialEvent(routingKey string, body []byte) {
	if routingKey != "social.user_followed" && routingKey != "social.user_unfollowed" {
		return
	}

	var event followEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("failed to unmarshal social event for following", slog.String("routing_key", routingKey), slog.Any("error", err))
		return
	}
	follower, followed := event.Payload.FollowerId, event.Payload.FollowedId

	m.mu.Lock()
	defer m.mu.Unlock()

	if state, ok := m.loading[follower]; ok {
		state.dirty = true
	}

	current, ok := m.cache.Peek(follower)
	if !ok {
		return
	}

	switch routingKey {
	case "social.user_followed":
		if slices.Contains(current, followed) {
			return
		}
		next := make([]uuid.UUID, len(current), len(current)+1)
		copy(next, current)
		m.cache.Add(follower, append(next, followed))
	case "social.user_unfollowed":
		idx := slices.Index(current, followed)
		if idx < 0 {
			return
		}
		next := make([]uuid.UUID, 0, len(current)-1)
		next = append(next, current[:idx]...)
		next = append(next, current[idx+1:]...)
		m.cache.Add(follower, next)
	}

	slog.Debug("following updated from social event", slog.String("routing_key", routingKey))
}
