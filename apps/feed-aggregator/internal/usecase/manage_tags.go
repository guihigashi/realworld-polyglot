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

// articleEvent is the subset of the article.created / article.updated / article.deleted envelope used for tag counts.
// previousTagList is only present on article.updated.
type articleEvent struct {
	Payload struct {
		TagList         []string `json:"tagList"`
		PreviousTagList []string `json:"previousTagList"`
	} `json:"payload"`
}

// tagDeltas returns how each tag's article count changes for the given event, or nil if the event does not affect tags.
//   - article.created: every tag +1
//   - article.deleted: every tag -1
//   - article.updated: tags only in the new list +1, tags only in the previous list -1
func tagDeltas(routingKey string, e articleEvent) map[string]int {
	deltas := make(map[string]int)
	add := func(tags []string, d int) {
		for _, tag := range tags {
			if tag != "" {
				deltas[tag] += d
			}
		}
	}

	switch routingKey {
	case "article.created":
		add(dedupe(e.Payload.TagList), 1)
	case "article.deleted":
		add(dedupe(e.Payload.TagList), -1)
	case "article.updated":
		add(dedupe(e.Payload.TagList), 1)
		add(dedupe(e.Payload.PreviousTagList), -1)
	default:
		return nil
	}

	for tag, d := range deltas {
		if d == 0 {
			delete(deltas, tag)
		}
	}
	return deltas
}

func dedupe(tags []string) []string {
	seen := make(map[string]struct{}, len(tags))
	out := make([]string, 0, len(tags))
	for _, t := range tags {
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		out = append(out, t)
	}
	return out
}

// HandleArticleEvent applies tag count changes via Copy-on-Write and atomically stores the new snapshot.
// Events received before the first warm-up are ignored: the warm-up reads the current state from article-service.
func (m *ManageTags) HandleArticleEvent(routingKey string, body []byte) {
	switch routingKey {
	case "article.created", "article.updated", "article.deleted":
	default:
		return
	}

	var event articleEvent
	if err := json.Unmarshal(body, &event); err != nil {
		slog.Error("failed to unmarshal article event for tags", slog.String("routing_key", routingKey), slog.Any("error", err))
		return
	}

	deltas := tagDeltas(routingKey, event)
	if len(deltas) == 0 {
		return
	}

	m.writeMu.Lock()
	defer m.writeMu.Unlock()

	ptr := m.snapshot.Load()
	if ptr == nil {
		return
	}
	current := *ptr

	countMap := make(map[string]int, len(current)+len(deltas))
	for _, t := range current {
		countMap[t.Tag] = t.Count
	}

	for tag, d := range deltas {
		countMap[tag] += d
	}

	next := make([]domain.CountedTag, 0, len(countMap))
	for tag, count := range countMap {
		if count > 0 {
			next = append(next, domain.CountedTag{Tag: tag, Count: count})
		}
	}
	sortTags(next)
	m.snapshot.Store(&next)

	slog.Debug("tags updated from article event", slog.String("routing_key", routingKey), slog.Any("deltas", deltas))
}

func sortTags(tags []domain.CountedTag) {
	sort.Slice(tags, func(i, j int) bool {
		if tags[i].Count == tags[j].Count {
			return tags[i].Tag < tags[j].Tag
		}
		return tags[i].Count > tags[j].Count
	})
}
