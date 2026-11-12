package usecase

import (
	"context"
	"encoding/json"
	"log/slog"
	"maps"
	"sync"
	"uuid"

	lru "github.com/hashicorp/golang-lru/v2"
	"golang.org/x/sync/singleflight"

	"github.com/guihigashi/conduit/feed/internal/appctx"
)

type FavoritesStore interface {
	UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, int64, error)
}

type cachedFavorites struct {
	ids     map[uuid.UUID]struct{}
	version int64
}

// ManageFavorites keeps the set of article IDs each logged-in user has favorited in memory along with their favorites_version.
//
//   - Filled on demand from article-service on a miss (or when cached version < minFavoritesVersion), bounded by an LRU over users.
//   - Kept current by article.favorited / article.unfavorited / article.deleted events (idempotent, monotonic version check).
//   - Cached maps are immutable: readers need no lock and must not modify the returned map.
//
// Events for users that are not cached are ignored: the next miss reads the current state from article-service.
type ManageFavorites struct {
	store FavoritesStore

	cache  *lru.Cache[uuid.UUID, cachedFavorites]
	flight singleflight.Group

	// mu serializes event application and load completion so an event arriving while a load is in flight
	// is never overwritten by the (possibly older) loaded snapshot.
	mu      sync.Mutex
	loading map[uuid.UUID]*loadState
}

func NewManageFavorites(store FavoritesStore, maxUsers int) (*ManageFavorites, error) {
	cache, err := lru.New[uuid.UUID, cachedFavorites](maxUsers)
	if err != nil {
		return nil, err
	}
	return &ManageFavorites{
		store:   store,
		cache:   cache,
		loading: make(map[uuid.UUID]*loadState),
	}, nil
}

// GetFavorited returns the article IDs favorited by userId, ensuring the returned state is at least minVersion.
func (m *ManageFavorites) GetFavorited(ctx context.Context, userId uuid.UUID, minVersion int64) (map[uuid.UUID]struct{}, error) {
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

		ids, version, err := m.store.UserFavoritedArticles(loadCtx, userId)

		m.mu.Lock()
		defer m.mu.Unlock()
		delete(m.loading, userId)
		if err != nil {
			return nil, err
		}
		if ids == nil {
			ids = make(map[uuid.UUID]struct{})
		}

		// Only overwrite cache if no newer event arrived while loading and current cache is not already ahead
		current, exists := m.cache.Peek(userId)
		if !state.dirty && (!exists || version >= current.version) {
			m.cache.Add(userId, cachedFavorites{ids: ids, version: version})
		}
		return ids, nil
	})
	if err != nil {
		return nil, err
	}
	return v.(map[uuid.UUID]struct{}), nil
}

type favoriteArticleEvent struct {
	Payload struct {
		ArticleId uuid.UUID `json:"articleId"`
		UserId    uuid.UUID `json:"userId"`
		Version   int64     `json:"version"`
	} `json:"payload"`
}

// HandleArticleEvent applies favorite, unfavorite, and delete events to the cached user sets.
func (m *ManageFavorites) HandleArticleEvent(routingKey string, body []byte) {
	switch routingKey {
	case "article.favorited", "article.unfavorited", "article.deleted":
	default:
		return
	}

	var event favoriteArticleEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("failed to unmarshal article event for favorites", slog.String("routing_key", routingKey), slog.Any("error", err))
		return
	}

	articleId := event.Payload.ArticleId
	if articleId == uuid.Nil() {
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if routingKey == "article.deleted" {
		for _, state := range m.loading {
			state.dirty = true
		}
		for _, userId := range m.cache.Keys() {
			current, ok := m.cache.Peek(userId)
			if !ok {
				continue
			}
			if _, exists := current.ids[articleId]; !exists {
				continue
			}
			next := maps.Clone(current.ids)
			delete(next, articleId)
			m.cache.Add(userId, cachedFavorites{ids: next, version: current.version})
		}
		return
	}

	userId := event.Payload.UserId
	version := event.Payload.Version
	if userId == uuid.Nil() {
		return
	}

	if state, ok := m.loading[userId]; ok {
		state.dirty = true
	}

	current, ok := m.cache.Peek(userId)
	if !ok {
		return
	}

	if version > 0 && current.version >= version {
		slog.Debug("ignoring older or duplicate favorite event", slog.Int64("current_version", current.version), slog.Int64("event_version", version))
		return
	}

	newVersion := version
	if newVersion <= current.version {
		newVersion = current.version + 1
	}

	switch routingKey {
	case "article.favorited":
		if _, exists := current.ids[articleId]; exists {
			m.cache.Add(userId, cachedFavorites{ids: current.ids, version: newVersion})
			return
		}
		next := make(map[uuid.UUID]struct{}, len(current.ids)+1)
		maps.Copy(next, current.ids)
		next[articleId] = struct{}{}
		m.cache.Add(userId, cachedFavorites{ids: next, version: newVersion})
	case "article.unfavorited":
		if _, exists := current.ids[articleId]; !exists {
			m.cache.Add(userId, cachedFavorites{ids: current.ids, version: newVersion})
			return
		}
		next := maps.Clone(current.ids)
		delete(next, articleId)
		m.cache.Add(userId, cachedFavorites{ids: next, version: newVersion})
	}

	slog.Debug("favorites updated from article event", slog.String("routing_key", routingKey), slog.Int64("version", newVersion))
}
