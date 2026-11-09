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
	UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error)
}

// ManageFavorites keeps the set of article IDs each logged-in user has favorited in memory.
//
//   - Filled on demand from article-service on a miss, bounded by an LRU over users.
//   - Kept current by article.favorited / article.unfavorited / article.deleted events (idempotent, copy-on-write).
//   - Cached maps are immutable: readers need no lock and must not modify the returned map.
//
// Events for users that are not cached are ignored: the next miss reads the current state from article-service.
type ManageFavorites struct {
	store FavoritesStore

	cache  *lru.Cache[uuid.UUID, map[uuid.UUID]struct{}]
	flight singleflight.Group

	// mu serializes event application and load completion so an event arriving while a load is in flight
	// is never overwritten by the (possibly older) loaded snapshot.
	mu      sync.Mutex
	loading map[uuid.UUID]*loadState
}

func NewManageFavorites(store FavoritesStore, maxUsers int) (*ManageFavorites, error) {
	cache, err := lru.New[uuid.UUID, map[uuid.UUID]struct{}](maxUsers)
	if err != nil {
		return nil, err
	}
	return &ManageFavorites{
		store:   store,
		cache:   cache,
		loading: make(map[uuid.UUID]*loadState),
	}, nil
}

// GetFavorited returns the article IDs favorited by userId. The returned map is shared and must not be modified.
func (m *ManageFavorites) GetFavorited(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error) {
	if ids, ok := m.cache.Get(userId); ok {
		return ids, nil
	}

	v, err, _ := m.flight.Do(userId.String(), func() (any, error) {
		loadCtx, cancel := context.WithTimeout(appctx.WithRequestorId(context.WithoutCancel(ctx), userId), loadTimeout)
		defer cancel()

		state := &loadState{}
		m.mu.Lock()
		m.loading[userId] = state
		m.mu.Unlock()

		ids, err := m.store.UserFavoritedArticles(loadCtx, userId)

		m.mu.Lock()
		defer m.mu.Unlock()
		delete(m.loading, userId)
		if err != nil {
			return nil, err
		}
		if ids == nil {
			ids = make(map[uuid.UUID]struct{})
		}
		if !state.dirty {
			m.cache.Add(userId, ids)
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
			if _, exists := current[articleId]; !exists {
				continue
			}
			next := maps.Clone(current)
			delete(next, articleId)
			m.cache.Add(userId, next)
		}
		return
	}

	userId := event.Payload.UserId
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

	switch routingKey {
	case "article.favorited":
		if _, exists := current[articleId]; exists {
			return
		}
		next := make(map[uuid.UUID]struct{}, len(current)+1)
		maps.Copy(next, current)
		next[articleId] = struct{}{}
		m.cache.Add(userId, next)
	case "article.unfavorited":
		if _, exists := current[articleId]; !exists {
			return
		}
		next := maps.Clone(current)
		delete(next, articleId)
		m.cache.Add(userId, next)
	}

	slog.Debug("favorites updated from article event", slog.String("routing_key", routingKey))
}
