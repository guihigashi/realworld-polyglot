package usecase

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync/atomic"
	"time"
	"uuid"

	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/samber/lo"
	"golang.org/x/sync/singleflight"

	"github.com/guihigashi/conduit/feed/internal/domain"
)

const loadTimeout = 10 * time.Second

// PublicArticlesArticles is the article-service port needed to list articles by filter.
type PublicArticlesArticles interface {
	ListArticlesFiltered(ctx context.Context, tag *string, authorId, favoritedById *uuid.UUID, limit, offset int) ([]domain.Article, int, error)
}

// PublicArticlesSocial is the social-graph port needed to resolve usernames and hydrate authors.
type PublicArticlesSocial interface {
	ResolveIdsByUsernames(ctx context.Context, usernames []string) (map[string]uuid.UUID, error)
	GetProfilesByIds(ctx context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error)
}

// ArticlesPage is a fully hydrated page of articles. Once built it is immutable and safe to share.
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
	if q.Limit < 0 {
		q.Limit = 0
	}
	return q
}

func (q ListArticlesQuery) key() string {
	return fmt.Sprintf("%q|%q|%q|%d|%d", q.Tag, q.Author, q.Favorited, q.Limit, q.Offset)
}

// ListPublicArticles serves the article listing for unauthenticated visitors (the requestor is ignored).
// Results are cached on demand per query in a size-bounded, TTL-expiring LRU.
type ListPublicArticles struct {
	articles PublicArticlesArticles
	social   PublicArticlesSocial

	cache  *expirable.LRU[string, *ArticlesPage]
	flight singleflight.Group
	// generation is bumped by Purge so that loads started before a purge never repopulate the cache with stale data.
	generation atomic.Uint64
}

func NewListPublicArticles(articles PublicArticlesArticles, social PublicArticlesSocial, cacheSize int, ttl time.Duration) *ListPublicArticles {
	return &ListPublicArticles{
		articles: articles,
		social:   social,
		cache:    expirable.NewLRU[string, *ArticlesPage](cacheSize, nil, ttl),
	}
}

func (l *ListPublicArticles) Execute(ctx context.Context, q ListArticlesQuery) (*ArticlesPage, error) {
	q = q.normalized()
	key := q.key()

	if page, ok := l.cache.Get(key); ok {
		return page, nil
	}

	v, err, _ := l.flight.Do(key, func() (any, error) {
		gen := l.generation.Load()

		// Detach from the first caller's cancellation: other callers share this result.
		loadCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), loadTimeout)
		defer cancel()

		page, err := l.load(loadCtx, q)
		if err != nil {
			return nil, err
		}
		if l.generation.Load() == gen {
			l.cache.Add(key, page)
		}
		return page, nil
	})
	if err != nil {
		return nil, err
	}
	return v.(*ArticlesPage), nil
}

// Purge drops every cached page. Called when articles change.
func (l *ListPublicArticles) Purge() {
	l.generation.Add(1)
	l.cache.Purge()
	slog.Debug("public articles cache purged")
}

func (l *ListPublicArticles) load(ctx context.Context, q ListArticlesQuery) (*ArticlesPage, error) {
	authorId, favoritedById, found, err := l.resolveFilters(ctx, q)
	if err != nil {
		return nil, err
	}
	if !found {
		// A filter references a username that does not exist: nothing can match.
		return &ArticlesPage{Articles: []domain.Article{}}, nil
	}

	var tag *string
	if q.Tag != "" {
		tag = &q.Tag
	}

	articles, count, err := l.articles.ListArticlesFiltered(ctx, tag, authorId, favoritedById, q.Limit, q.Offset)
	if err != nil {
		return nil, err
	}
	if articles == nil {
		articles = []domain.Article{}
	}

	var profiles map[uuid.UUID]domain.Profile
	if len(articles) > 0 {
		authorIds := lo.UniqMap(articles, func(a domain.Article, _ int) uuid.UUID { return a.AuthorId })
		profiles, err = l.social.GetProfilesByIds(ctx, authorIds)
		if err != nil {
			return nil, err
		}
	}

	return &ArticlesPage{Articles: articles, ArticlesCount: count, Profiles: profiles}, nil
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
