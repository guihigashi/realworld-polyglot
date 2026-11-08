package usecase

import (
	"context"
	"encoding/json"
	"testing"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/appctx"
	"github.com/guihigashi/conduit/feed/internal/domain"
)

type fakeArticlesPort struct {
	filteredCalls int
	feedCalls     int
	favCalls      int
	articles      []domain.Article
	totalCount    int
	favoritedBy   map[uuid.UUID]map[uuid.UUID]struct{}
}

func (f *fakeArticlesPort) ListArticlesFiltered(_ context.Context, _ *string, _, _ *uuid.UUID, limit, offset int) ([]domain.Article, int, error) {
	f.filteredCalls++
	return sliceArticles(f.articles, offset, limit), f.totalCount, nil
}

func (f *fakeArticlesPort) ListArticles(_ context.Context, _ []uuid.UUID, limit, offset int) ([]domain.Article, int, error) {
	f.feedCalls++
	return sliceArticles(f.articles, offset, limit), f.totalCount, nil
}

func (f *fakeArticlesPort) UserFavoritedArticles(_ context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error) {
	f.favCalls++
	out := make(map[uuid.UUID]struct{})
	if set, ok := f.favoritedBy[userId]; ok {
		for id := range set {
			out[id] = struct{}{}
		}
	}
	return out, nil
}

type fakeSocialPort struct {
	usernames map[string]uuid.UUID
	profiles  map[uuid.UUID]domain.Profile
	following map[uuid.UUID][]uuid.UUID
}

func (f *fakeSocialPort) ResolveIdsByUsernames(_ context.Context, usernames []string) (map[string]uuid.UUID, error) {
	out := make(map[string]uuid.UUID)
	for _, u := range usernames {
		if id, ok := f.usernames[u]; ok {
			out[u] = id
		}
	}
	return out, nil
}

func (f *fakeSocialPort) GetProfilesByIds(_ context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error) {
	out := make(map[uuid.UUID]domain.Profile, len(userIds))
	for _, id := range userIds {
		if p, ok := f.profiles[id]; ok {
			out[id] = p
		}
	}
	return out, nil
}

func (f *fakeSocialPort) GetFollowing(_ context.Context, userId uuid.UUID) ([]uuid.UUID, error) {
	return f.following[userId], nil
}

func TestListPublicArticles_GranularEventsAndUserAggregation(t *testing.T) {
	author1 := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	author2 := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	viewer := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	art1 := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	art2 := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

	t0 := time.Date(2026, 11, 8, 12, 0, 0, 0, time.UTC)

	articlesPort := &fakeArticlesPort{
		articles: []domain.Article{
			{
				Id:             art1,
				Slug:           "first-article",
				Title:          "First Article",
				Description:    "First desc",
				TagList:        []string{"go"},
				CreatedAt:      t0,
				UpdatedAt:      t0,
				FavoritesCount: 0,
				AuthorId:       author1,
			},
		},
		totalCount: 1,
		favoritedBy: map[uuid.UUID]map[uuid.UUID]struct{}{
			viewer: {},
		},
	}
	socialPort := &fakeSocialPort{
		usernames: map[string]uuid.UUID{
			"alice":  author1,
			"bob":    author2,
			"viewer": viewer,
		},
		profiles: map[uuid.UUID]domain.Profile{
			author1: {Id: author1, Username: "alice"},
			author2: {Id: author2, Username: "bob"},
		},
		following: map[uuid.UUID][]uuid.UUID{
			viewer: {author1},
		},
	}

	followingCache, err := NewManageFollowing(socialPort, 100)
	if err != nil {
		t.Fatalf("NewManageFollowing: %v", err)
	}
	favoritesCache, err := NewManageFavorites(articlesPort, 100)
	if err != nil {
		t.Fatalf("NewManageFavorites: %v", err)
	}
	uc := NewListPublicArticles(articlesPort, socialPort, followingCache, favoritesCache, 2)

	// 1. First execute warms up cache from article-service
	page, err := uc.Execute(context.Background(), ListArticlesQuery{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute: %v", err)
	}
	if articlesPort.filteredCalls != 1 {
		t.Fatalf("expected 1 filteredCall on warmup, got %d", articlesPort.filteredCalls)
	}
	if page.ArticlesCount != 1 || len(page.Articles) != 1 || page.Articles[0].Slug != "first-article" {
		t.Fatalf("unexpected initial page: %+v", page)
	}

	// 2. article.created prepends the newer article without calling article-service again
	createdBody, _ := json.Marshal(map[string]any{
		"payload": map[string]any{
			"articleId":   art2.String(),
			"slug":        "second-article",
			"title":       "Second Article",
			"description": "Second desc",
			"tagList":     []string{"rust", "go"},
			"authorId":    author2.String(),
			"createdAt":   t0.Add(time.Minute).Format(time.RFC3339),
			"updatedAt":   t0.Add(time.Minute).Format(time.RFC3339),
		},
	})
	uc.HandleArticleEvent("article.created", createdBody)

	page, err = uc.Execute(context.Background(), ListArticlesQuery{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute after create: %v", err)
	}
	if articlesPort.filteredCalls != 1 {
		t.Fatalf("expected no additional filteredCalls, got %d", articlesPort.filteredCalls)
	}
	if page.ArticlesCount != 2 || len(page.Articles) != 2 {
		t.Fatalf("expected 2 articles, got count=%d len=%d", page.ArticlesCount, len(page.Articles))
	}
	if page.Articles[0].Slug != "second-article" || page.Articles[1].Slug != "first-article" {
		t.Fatalf("expected newest article first, got %s then %s", page.Articles[0].Slug, page.Articles[1].Slug)
	}

	// 3. article.updated mutates the article in-place (including slug rename)
	updatedBody, _ := json.Marshal(map[string]any{
		"payload": map[string]any{
			"articleId":    art2.String(),
			"slug":         "second-article-renamed",
			"previousSlug": "second-article",
			"title":        "Second Article Renamed",
			"description":  "Updated desc",
			"tagList":      []string{"rust"},
			"authorId":     author2.String(),
			"updatedAt":    t0.Add(2 * time.Minute).Format(time.RFC3339),
		},
	})
	uc.HandleArticleEvent("article.updated", updatedBody)

	page, err = uc.Execute(context.Background(), ListArticlesQuery{Tag: "rust", Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute tag=rust: %v", err)
	}
	if len(page.Articles) != 1 || page.Articles[0].Slug != "second-article-renamed" {
		t.Fatalf("expected updated article under rust tag, got %+v", page.Articles)
	}

	// 4. Logged-in user favorites art1 -> both newest articles cache and ManageFavorites update
	authCtx := appctx.WithRequestorId(context.Background(), viewer)
	// Warm viewer's caches on first logged-in call
	page, err = uc.Execute(authCtx, ListArticlesQuery{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute logged-in: %v", err)
	}
	if !page.Profiles[author1].Following || page.Profiles[author2].Following {
		t.Fatalf("expected viewer to follow author1 only, got %+v", page.Profiles)
	}

	favBody, _ := json.Marshal(map[string]any{
		"payload": map[string]any{
			"articleId":      art1.String(),
			"slug":           "first-article",
			"userId":         viewer.String(),
			"favoritesCount": 1,
		},
	})
	uc.HandleArticleEvent("article.favorited", favBody)
	favoritesCache.HandleArticleEvent("article.favorited", favBody)

	// Logged-in viewer sees Favorited=true and FavoritesCount=1 on art1
	page, err = uc.Execute(authCtx, ListArticlesQuery{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute logged-in after favorite: %v", err)
	}
	if !page.Articles[1].Favorited || page.Articles[1].FavoritesCount != 1 {
		t.Fatalf("expected art1 favorited=true count=1 for viewer, got %+v", page.Articles[1])
	}

	// Unauthenticated visitor sees Favorited=false and FavoritesCount=1 on art1
	anonPage, err := uc.Execute(context.Background(), ListArticlesQuery{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute anon after favorite: %v", err)
	}
	if anonPage.Articles[1].Favorited || anonPage.Articles[1].FavoritesCount != 1 {
		t.Fatalf("expected art1 favorited=false count=1 for anon, got %+v", anonPage.Articles[1])
	}
	if anonPage.Profiles[author1].Following {
		t.Fatalf("expected anon following=false")
	}

	// 5. GenerateFeed uses the shared newest-articles cache + ManageFollowing + ManageFavorites
	genFeed := &GenerateFeed{
		Following:      followingCache,
		Favorites:      favoritesCache,
		Social:         socialPort,
		Articles:       articlesPort,
		NewestArticles: uc,
	}
	feed, err := genFeed.Execute(authCtx, viewer, 10, 0)
	if err != nil {
		t.Fatalf("GenerateFeed.Execute: %v", err)
	}
	if articlesPort.feedCalls != 0 {
		t.Fatalf("expected 0 upstream feedCalls when snapshot is complete, got %d", articlesPort.feedCalls)
	}
	if feed.ArticlesCount != 1 || len(feed.Articles) != 1 || feed.Articles[0].Slug != "first-article" || !feed.Articles[0].Favorited {
		t.Fatalf("unexpected feed result: %+v", feed)
	}

	// 6. article.deleted removes art1 from the cache and from viewer's favorites
	delBody, _ := json.Marshal(map[string]any{
		"payload": map[string]any{
			"articleId": art1.String(),
			"slug":      "first-article",
		},
	})
	uc.HandleArticleEvent("article.deleted", delBody)
	favoritesCache.HandleArticleEvent("article.deleted", delBody)

	page, err = uc.Execute(context.Background(), ListArticlesQuery{Limit: 10, Offset: 0})
	if err != nil {
		t.Fatalf("Execute after delete: %v", err)
	}
	if page.ArticlesCount != 1 || len(page.Articles) != 1 || page.Articles[0].Slug != "second-article-renamed" {
		t.Fatalf("expected only second-article-renamed after delete, got %+v", page)
	}
}
