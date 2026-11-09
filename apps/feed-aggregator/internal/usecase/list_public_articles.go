package usecase

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"uuid"

	"github.com/samber/lo"

	"github.com/guihigashi/conduit/feed/internal/appctx"
	"github.com/guihigashi/conduit/feed/internal/domain"
)

const (
	loadTimeout      = 10 * time.Second
	defaultPageLimit = 20
)

// PublicArticlesArticles is the article-service port needed to list articles by filter.
type PublicArticlesArticles interface {
	ListArticlesFiltered(ctx context.Context, tag *string, authorId, favoritedById *uuid.UUID, limit, offset int) ([]domain.Article, int, error)
}

// PublicArticlesSocial is the social-graph port needed to resolve usernames and hydrate authors.
type PublicArticlesSocial interface {
	ResolveIdsByUsernames(ctx context.Context, usernames []string) (map[string]uuid.UUID, error)
	GetProfilesByIds(ctx context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error)
}

type Favorites interface {
	GetFavorited(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error)
}

// ArticlesPage is a hydrated page of articles ready for delivery.
type ArticlesPage struct {
	Articles      []domain.Article
	ArticlesCount int
	Profiles      map[uuid.UUID]domain.Profile
}

type ListArticlesQuery struct {
	Tag       string
	Author    string // username
	Favorited string // username
	Limit     int
	Offset    int
}

func (q ListArticlesQuery) normalized() ListArticlesQuery {
	q.Tag = strings.TrimSpace(q.Tag)
	q.Author = strings.TrimSpace(q.Author)
	q.Favorited = strings.TrimSpace(q.Favorited)
	if q.Offset < 0 {
		q.Offset = 0
	}
	if q.Limit <= 0 {
		q.Limit = defaultPageLimit
	}
	return q
}

type articlesSnapshot struct {
	articles   []domain.Article // ordered by CreatedAt DESC, length <= maxSize
	totalCount int              // total unfiltered articles in article-service
}

func (s *articlesSnapshot) isComplete() bool {
	return len(s.articles) >= s.totalCount
}

// ListPublicArticles keeps a bounded window of the N newest articles (ordered by CreatedAt DESC) in memory,
// updated granularly from article.* RabbitMQ events.
//
//   - Early pages within the cached window are served directly from memory; deeper pages fall back to article-service.
//   - When a logged-in requestor is present in ctx, the returned page is aggregated with the user's cached
//     favorited articles and followed authors before returning.
type ListPublicArticles struct {
	articles  PublicArticlesArticles
	social    PublicArticlesSocial
	following Following
	favorites Favorites
	maxSize   int

	writeMu  sync.Mutex
	snapshot atomic.Pointer[articlesSnapshot]
}

func NewListPublicArticles(
	articles PublicArticlesArticles,
	social PublicArticlesSocial,
	following Following,
	favorites Favorites,
	maxSize int,
) *ListPublicArticles {
	if maxSize <= 0 {
		maxSize = 1000
	}
	return &ListPublicArticles{
		articles:  articles,
		social:    social,
		following: following,
		favorites: favorites,
		maxSize:   maxSize,
	}
}

func (l *ListPublicArticles) WarmUp(ctx context.Context) error {
	l.writeMu.Lock()
	defer l.writeMu.Unlock()

	if l.snapshot.Load() != nil {
		return nil
	}

	loadCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), loadTimeout)
	defer cancel()

	articles, totalCount, err := l.articles.ListArticlesFiltered(loadCtx, nil, nil, nil, l.maxSize, 0)
	if err != nil {
		return err
	}
	if articles == nil {
		articles = []domain.Article{}
	}
	for i := range articles {
		articles[i].Favorited = false
		articles[i].TagList = normalizeTagList(articles[i].TagList)
	}

	snap := &articlesSnapshot{
		articles:   articles,
		totalCount: totalCount,
	}
	l.snapshot.Store(snap)

	slog.Info("newest articles warmed up from article-service",
		slog.Int("cached_count", len(articles)),
		slog.Int("total_count", totalCount),
	)
	return nil
}

func (l *ListPublicArticles) getOrWarmSnapshot(ctx context.Context) (*articlesSnapshot, error) {
	ptr := l.snapshot.Load()
	if ptr == nil {
		if err := l.WarmUp(ctx); err != nil {
			return nil, err
		}
		ptr = l.snapshot.Load()
	}
	if ptr == nil {
		return &articlesSnapshot{articles: []domain.Article{}}, nil
	}
	return ptr, nil
}

// ListByAuthors serves articles written by authorIds from the cached newest-articles window when the window
// covers the full dataset. ok is false when older articles outside the window may exist.
func (l *ListPublicArticles) ListByAuthors(ctx context.Context, authorIds []uuid.UUID, limit, offset int) (articles []domain.Article, totalCount int, ok bool, err error) {
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 {
		limit = defaultPageLimit
	}
	snap, err := l.getOrWarmSnapshot(ctx)
	if err != nil {
		return nil, 0, false, err
	}
	if !snap.isComplete() {
		return nil, 0, false, nil
	}

	authorSet := make(map[uuid.UUID]struct{}, len(authorIds))
	for _, id := range authorIds {
		authorSet[id] = struct{}{}
	}

	var matched []domain.Article
	for _, a := range snap.articles {
		if _, match := authorSet[a.AuthorId]; match {
			matched = append(matched, a)
		}
	}

	return sliceArticles(matched, offset, limit), len(matched), true, nil
}

func (l *ListPublicArticles) Execute(ctx context.Context, q ListArticlesQuery) (*ArticlesPage, error) {
	q = q.normalized()

	authorId, favoritedById, found, err := l.resolveFilters(ctx, q)
	if err != nil {
		return nil, err
	}
	if !found {
		return &ArticlesPage{Articles: []domain.Article{}}, nil
	}

	var favoritedBySet map[uuid.UUID]struct{}
	if favoritedById != nil && l.favorites != nil {
		favoritedBySet, err = l.favorites.GetFavorited(ctx, *favoritedById)
		if err != nil {
			return nil, err
		}
		if len(favoritedBySet) == 0 {
			return &ArticlesPage{Articles: []domain.Article{}}, nil
		}
	}

	articles, totalCount, err := l.selectArticles(ctx, q, authorId, favoritedById, favoritedBySet)
	if err != nil {
		return nil, err
	}

	return l.hydratePage(ctx, articles, totalCount)
}

func (l *ListPublicArticles) selectArticles(
	ctx context.Context,
	q ListArticlesQuery,
	authorId, favoritedById *uuid.UUID,
	favoritedBySet map[uuid.UUID]struct{},
) ([]domain.Article, int, error) {
	snap, err := l.getOrWarmSnapshot(ctx)
	if err != nil {
		return nil, 0, err
	}

	unfiltered := q.Tag == "" && authorId == nil && favoritedById == nil
	if unfiltered {
		if snap.isComplete() || q.Offset+q.Limit <= len(snap.articles) {
			return sliceArticles(snap.articles, q.Offset, q.Limit), snap.totalCount, nil
		}
		return l.fetchFromService(ctx, q, authorId, favoritedById)
	}

	// Filtered query: if the snapshot is complete, or if filtering only by favoritedBySet and every
	// favorited article is present in the window, we can satisfy it purely from memory.
	if snap.isComplete() || (q.Tag == "" && authorId == nil && favoritedBySet != nil && allFavoritesInSnapshot(snap.articles, favoritedBySet)) {
		var matched []domain.Article
		for _, a := range snap.articles {
			if q.Tag != "" && !slices.Contains(a.TagList, q.Tag) {
				continue
			}
			if authorId != nil && a.AuthorId != *authorId {
				continue
			}
			if favoritedById != nil {
				if favoritedBySet == nil || a.Id == uuid.Nil() {
					return l.fetchFromService(ctx, q, authorId, favoritedById)
				}
				if _, ok := favoritedBySet[a.Id]; !ok {
					continue
				}
			}
			matched = append(matched, a)
		}
		return sliceArticles(matched, q.Offset, q.Limit), len(matched), nil
	}

	return l.fetchFromService(ctx, q, authorId, favoritedById)
}

func (l *ListPublicArticles) fetchFromService(ctx context.Context, q ListArticlesQuery, authorId, favoritedById *uuid.UUID) ([]domain.Article, int, error) {
	var tag *string
	if q.Tag != "" {
		tag = &q.Tag
	}
	articles, count, err := l.articles.ListArticlesFiltered(ctx, tag, authorId, favoritedById, q.Limit, q.Offset)
	if err != nil {
		return nil, 0, err
	}
	if articles == nil {
		articles = []domain.Article{}
	}
	return articles, count, nil
}

func (l *ListPublicArticles) hydratePage(ctx context.Context, articles []domain.Article, totalCount int) (*ArticlesPage, error) {
	if len(articles) == 0 {
		return &ArticlesPage{Articles: []domain.Article{}, ArticlesCount: totalCount}, nil
	}

	authorIds := lo.UniqMap(articles, func(a domain.Article, _ int) uuid.UUID { return a.AuthorId })
	profiles, err := l.social.GetProfilesByIds(ctx, authorIds)
	if err != nil {
		return nil, err
	}

	pageProfiles := make(map[uuid.UUID]domain.Profile, len(profiles))
	for id, p := range profiles {
		p.Following = false
		pageProfiles[id] = p
	}

	requestorId, loggedIn := appctx.RequestorIdFromContext(ctx)
	if !loggedIn {
		for i := range articles {
			articles[i].Favorited = false
		}
		return &ArticlesPage{Articles: articles, ArticlesCount: totalCount, Profiles: pageProfiles}, nil
	}

	if l.following != nil {
		followingIds, err := l.following.GetFollowing(ctx, requestorId, 0)
		if err != nil {
			return nil, err
		}
		for id, p := range pageProfiles {
			p.Following = slices.Contains(followingIds, id)
			pageProfiles[id] = p
		}
	}

	if l.favorites != nil {
		favoritedIds, err := l.favorites.GetFavorited(ctx, requestorId)
		if err != nil {
			return nil, err
		}
		for i := range articles {
			_, articles[i].Favorited = favoritedIds[articles[i].Id]
		}
	}

	return &ArticlesPage{Articles: articles, ArticlesCount: totalCount, Profiles: pageProfiles}, nil
}

// resolveFilters turns the author/favorited usernames into ids. found is false when any requested username is unknown.
func (l *ListPublicArticles) resolveFilters(ctx context.Context, q ListArticlesQuery) (authorId, favoritedById *uuid.UUID, found bool, err error) {
	usernames := lo.Uniq(lo.Filter([]string{q.Author, q.Favorited}, func(s string, _ int) bool { return s != "" }))
	if len(usernames) == 0 {
		return nil, nil, true, nil
	}

	resolved, err := l.social.ResolveIdsByUsernames(ctx, usernames)
	if err != nil {
		return nil, nil, false, err
	}

	lookup := func(username string) (*uuid.UUID, bool) {
		if username == "" {
			return nil, true
		}
		id, ok := resolved[username]
		if !ok {
			return nil, false
		}
		return &id, true
	}

	var ok bool
	if authorId, ok = lookup(q.Author); !ok {
		return nil, nil, false, nil
	}
	if favoritedById, ok = lookup(q.Favorited); !ok {
		return nil, nil, false, nil
	}
	return authorId, favoritedById, true, nil
}

type articleCreatedEvent struct {
	Payload struct {
		ArticleId   uuid.UUID `json:"articleId"`
		Slug        string    `json:"slug"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		TagList     []string  `json:"tagList"`
		AuthorId    uuid.UUID `json:"authorId"`
		CreatedAt   time.Time `json:"createdAt"`
		UpdatedAt   time.Time `json:"updatedAt"`
	} `json:"payload"`
}

type articleUpdatedEvent struct {
	Payload struct {
		ArticleId    uuid.UUID `json:"articleId"`
		Slug         string    `json:"slug"`
		PreviousSlug string    `json:"previousSlug"`
		Title        string    `json:"title"`
		Description  string    `json:"description"`
		TagList      []string  `json:"tagList"`
		AuthorId     uuid.UUID `json:"authorId"`
		UpdatedAt    time.Time `json:"updatedAt"`
	} `json:"payload"`
}

type articleDeletedEvent struct {
	Payload struct {
		ArticleId uuid.UUID `json:"articleId"`
		Slug      string    `json:"slug"`
	} `json:"payload"`
}

type articleFavoriteCountEvent struct {
	Payload struct {
		ArticleId      uuid.UUID `json:"articleId"`
		Slug           string    `json:"slug"`
		FavoritesCount int       `json:"favoritesCount"`
	} `json:"payload"`
}

// HandleArticleEvent applies granular changes to the cached N newest articles via copy-on-write.
// Events arriving before the first warm-up are ignored because WarmUp loads the current state.
func (l *ListPublicArticles) HandleArticleEvent(routingKey string, body []byte) {
	switch routingKey {
	case "article.created", "article.updated", "article.deleted", "article.favorited", "article.unfavorited":
	default:
		return
	}

	if l.snapshot.Load() == nil {
		return
	}

	l.writeMu.Lock()
	defer l.writeMu.Unlock()

	current := l.snapshot.Load()
	if current == nil {
		return
	}

	switch routingKey {
	case "article.created":
		var event articleCreatedEvent
		if err := json.Unmarshal(body, &event); err != nil {
			slog.Error("failed to unmarshal article.created for newest articles", slog.Any("error", err))
			return
		}
		p := event.Payload
		if findArticleIndex(current.articles, p.ArticleId, p.Slug, "") >= 0 {
			return
		}
		created := domain.Article{
			Id:             p.ArticleId,
			Slug:           p.Slug,
			Title:          p.Title,
			Description:    p.Description,
			TagList:        normalizeTagList(p.TagList),
			CreatedAt:      p.CreatedAt.UTC(),
			UpdatedAt:      p.UpdatedAt.UTC(),
			Favorited:      false,
			FavoritesCount: 0,
			AuthorId:       p.AuthorId,
		}
		next := insertByCreatedAtDesc(current.articles, created, l.maxSize)
		l.snapshot.Store(&articlesSnapshot{
			articles:   next,
			totalCount: current.totalCount + 1,
		})

	case "article.updated":
		var event articleUpdatedEvent
		if err := json.Unmarshal(body, &event); err != nil {
			slog.Error("failed to unmarshal article.updated for newest articles", slog.Any("error", err))
			return
		}
		p := event.Payload
		idx := findArticleIndex(current.articles, p.ArticleId, p.Slug, p.PreviousSlug)
		if idx < 0 {
			return
		}
		next := slices.Clone(current.articles)
		updated := next[idx]
		if p.ArticleId != uuid.Nil() {
			updated.Id = p.ArticleId
		}
		updated.Slug = p.Slug
		updated.Title = p.Title
		updated.Description = p.Description
		updated.TagList = normalizeTagList(p.TagList)
		updated.UpdatedAt = p.UpdatedAt.UTC()
		next[idx] = updated
		l.snapshot.Store(&articlesSnapshot{
			articles:   next,
			totalCount: current.totalCount,
		})

	case "article.deleted":
		var event articleDeletedEvent
		if err := json.Unmarshal(body, &event); err != nil {
			slog.Error("failed to unmarshal article.deleted for newest articles", slog.Any("error", err))
			return
		}
		p := event.Payload
		nextTotal := max(0, current.totalCount-1)
		idx := findArticleIndex(current.articles, p.ArticleId, p.Slug, "")
		next := current.articles
		if idx >= 0 {
			next = make([]domain.Article, 0, len(current.articles)-1)
			next = append(next, current.articles[:idx]...)
			next = append(next, current.articles[idx+1:]...)
		}
		l.snapshot.Store(&articlesSnapshot{
			articles:   next,
			totalCount: nextTotal,
		})

	case "article.favorited", "article.unfavorited":
		var event articleFavoriteCountEvent
		if err := json.Unmarshal(body, &event); err != nil {
			slog.Error("failed to unmarshal article favorite event for newest articles", slog.String("routing_key", routingKey), slog.Any("error", err))
			return
		}
		p := event.Payload
		idx := findArticleIndex(current.articles, p.ArticleId, p.Slug, "")
		if idx < 0 {
			return
		}
		next := slices.Clone(current.articles)
		next[idx].FavoritesCount = p.FavoritesCount
		l.snapshot.Store(&articlesSnapshot{
			articles:   next,
			totalCount: current.totalCount,
		})
	}

	slog.Debug("newest articles cache updated from event", slog.String("routing_key", routingKey))
}

func findArticleIndex(articles []domain.Article, id uuid.UUID, slug, previousSlug string) int {
	for i := range articles {
		if id != uuid.Nil() && articles[i].Id == id {
			return i
		}
		if previousSlug != "" && articles[i].Slug == previousSlug {
			return i
		}
		if slug != "" && articles[i].Slug == slug {
			return i
		}
	}
	return -1
}

func insertByCreatedAtDesc(current []domain.Article, created domain.Article, maxSize int) []domain.Article {
	insertIdx := 0
	for insertIdx < len(current) && current[insertIdx].CreatedAt.After(created.CreatedAt) {
		insertIdx++
	}
	next := make([]domain.Article, 0, min(len(current)+1, maxSize))
	next = append(next, current[:insertIdx]...)
	if len(next) < maxSize {
		next = append(next, created)
	}
	if len(next) < maxSize && insertIdx < len(current) {
		remaining := maxSize - len(next)
		end := min(len(current), insertIdx+remaining)
		next = append(next, current[insertIdx:end]...)
	}
	return next
}

func sliceArticles(articles []domain.Article, offset, limit int) []domain.Article {
	if offset >= len(articles) || limit <= 0 {
		return []domain.Article{}
	}
	end := min(offset+limit, len(articles))
	out := make([]domain.Article, end-offset)
	copy(out, articles[offset:end])
	return out
}

func normalizeTagList(tags []string) []string {
	if len(tags) == 0 {
		return []string{}
	}
	out := dedupe(tags)
	sort.Strings(out)
	return out
}

func allFavoritesInSnapshot(articles []domain.Article, favoritedSet map[uuid.UUID]struct{}) bool {
	if len(favoritedSet) == 0 {
		return true
	}
	found := 0
	for i := range articles {
		if articles[i].Id == uuid.Nil() {
			return false
		}
		if _, ok := favoritedSet[articles[i].Id]; ok {
			found++
			if found == len(favoritedSet) {
				return true
			}
		}
	}
	return false
}
