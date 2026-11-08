package usecase

import (
	"context"
	"encoding/json"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/guihigashi/conduit/feed/internal/domain"
)

type TagStore interface {
	GetTags(ctx context.Context) ([]domain.CountedTag, error)
}

type ManageTags struct {
	articlesClient TagStore
	writeMu        sync.Mutex
	snapshot       atomic.Pointer[[]domain.CountedTag]
}

func NewManageTags(articlesClient TagStore) *ManageTags {
	return &ManageTags{
		articlesClient: articlesClient,
	}
}

// GetTags returns the counted tags sorted by count descending, then tag name ascending (lock-free, zero-copy).
func (m *ManageTags) GetTags(ctx context.Context) ([]domain.CountedTag, error) {
	ptr := m.snapshot.Load()
	if ptr == nil {
		if err := m.WarmUp(ctx); err != nil {
			return nil, err
		}
		ptr = m.snapshot.Load()
	}
	if ptr == nil {
		return []domain.CountedTag{}, nil
	}
	return *ptr, nil
}

// SearchTags returns matching tags containing query (case-insensitive substring match),
// prioritizing prefix matches, ordered by popularity (count descending). Lock-free and zero-copy.
func (m *ManageTags) SearchTags(ctx context.Context, query string, limit int) ([]domain.CountedTag, error) {
	ptr := m.snapshot.Load()
	if ptr == nil {
		if err := m.WarmUp(ctx); err != nil {
			return nil, err
		}
		ptr = m.snapshot.Load()
	}
	if ptr == nil {
		return []domain.CountedTag{}, nil
	}
	tags := *ptr

	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		if limit > 0 && len(tags) > limit {
			return tags[:limit], nil
		}
		return tags, nil
	}

	var prefixMatches []domain.CountedTag
	var substringMatches []domain.CountedTag

	for _, t := range tags {
		lowerTag := strings.ToLower(t.Tag)
		if strings.HasPrefix(lowerTag, query) {
			prefixMatches = append(prefixMatches, t)
		} else if strings.Contains(lowerTag, query) {
			substringMatches = append(substringMatches, t)
		}
	}

	matches := append(prefixMatches, substringMatches...)
	if limit > 0 && len(matches) > limit {
		matches = matches[:limit]
	}
	return matches, nil
}

func (m *ManageTags) WarmUp(ctx context.Context) error {
	m.writeMu.Lock()
	defer m.writeMu.Unlock()

	if m.snapshot.Load() != nil {
		return nil
	}

	tags, err := m.articlesClient.GetTags(ctx)
	if err != nil {
		return err
	}

	sorted := make([]domain.CountedTag, len(tags))
	copy(sorted, tags)
	sortTags(sorted)
	m.snapshot.Store(&sorted)

	slog.Info("tags warmed up from article-service", slog.Int("tag_count", len(sorted)))
	return nil
}

type articleCreatedPayload struct {
	TagList []string `json:"tagList"`
}

type articleCreatedEvent struct {
	Payload articleCreatedPayload `json:"payload"`
}

// HandleArticleEvent updates tag counts via Copy-on-Write and atomically stores the new snapshot.
func (m *ManageTags) HandleArticleEvent(routingKey string, body []byte) {
	if routingKey != "article.created" {
		return
	}

	var event articleCreatedEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("failed to unmarshal article event for tags", slog.Any("error", err))
		return
	}

	m.writeMu.Lock()
	defer m.writeMu.Unlock()

	var current []domain.CountedTag
	if ptr := m.snapshot.Load(); ptr != nil {
		current = *ptr
	}

	countMap := make(map[string]int, len(current)+len(event.Payload.TagList))
	for _, t := range current {
		countMap[t.Tag] = t.Count
	}

	for _, tag := range event.Payload.TagList {
		if tag != "" {
			countMap[tag]++
		}
	}

	next := make([]domain.CountedTag, 0, len(countMap))
	for tag, count := range countMap {
		next = append(next, domain.CountedTag{Tag: tag, Count: count})
	}
	sortTags(next)
	m.snapshot.Store(&next)

	slog.Debug("tags updated from article.created", slog.Any("tags", event.Payload.TagList))
}

func sortTags(tags []domain.CountedTag) {
	sort.Slice(tags, func(i, j int) bool {
		if tags[i].Count == tags[j].Count {
			return tags[i].Tag < tags[j].Tag
		}
		return tags[i].Count > tags[j].Count
	})
}
