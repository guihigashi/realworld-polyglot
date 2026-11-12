package usecase

import (
	"context"
	"encoding/json"
	"testing"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/appctx"
	"github.com/guihigashi/conduit/feed/internal/domain"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeArticlesPort struct {
	filteredCalls int
	feedCalls     int
	favCalls      int
	getCalls      int
	articles      []domain.Article
	comments      []domain.Comment
	totalCount    int
	favoritedBy   map[uuid.UUID]map[uuid.UUID]struct{}
}

func (f *fakeArticlesPort) GetComments(_ context.Context, _ string) ([]domain.Comment, error) {
	return f.comments, nil
}

func (f *fakeArticlesPort) GetArticle(_ context.Context, slug string) (*domain.Article, error) {
	f.getCalls++
	for _, a := range f.articles {
		if a.Slug == slug {
			return &a, nil
		}
	}
	return nil, status.Error(codes.NotFound, "article not found")
}

func (f *fakeArticlesPort) ListArticlesFiltered(_ context.Context, _ *string, _, _ *uuid.UUID, limit, offset int) ([]domain.Article, int, error) {
	f.filteredCalls++
	return sliceArticles(f.articles, offset, limit), f.totalCount, nil
}

func (f *fakeArticlesPort) ListArticles(_ context.Context, _ []uuid.UUID, limit, offset int) ([]domain.Article, int, error) {
	f.feedCalls++
	return sliceArticles(f.articles, offset, limit), f.totalCount, nil
}

func (f *fakeArticlesPort) UserFavoritedArticles(_ context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, int64, error) {
	f.favCalls++
	out := make(map[uuid.UUID]struct{})
	if set, ok := f.favoritedBy[userId]; ok {
		for id := range set {
			out[id] = struct{}{}
		}
	}
	return out, 1, nil
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

func (f *fakeSocialPort) GetFollowing(_ context.Context, userId uuid.UUID) ([]uuid.UUID, int64, error) {
	return f.following[userId], 1, nil
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
	feed, err := genFeed.Execute(authCtx, viewer, 10, 0, 0, 0)
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

func TestManageFavorites_CausalConsistency(t *testing.T) {
	userId := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	art1 := uuid.MustParse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
	art2 := uuid.MustParse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

	var currentVersion int64 = 1
	store := &fakeArticlesPort{
		favoritedBy: map[uuid.UUID]map[uuid.UUID]struct{}{
			userId: {art1: {}},
		},
	}
	// Overwrite fake implementation to return currentVersion
	favStore := &versionedFavStore{
		port:    store,
		version: &currentVersion,
	}

	favCache, err := NewManageFavorites(favStore, 10)
	if err != nil {
		t.Fatalf("NewManageFavorites: %v", err)
	}

	// 1. Initial lookup populates cache with version 1
	favs, err := favCache.GetFavorited(context.Background(), userId, 1)
	if err != nil {
		t.Fatalf("GetFavorited: %v", err)
	}
	if _, ok := favs[art1]; !ok {
		t.Fatalf("expected art1 in favorites")
	}

	// 2. Event arrives with version 2 adding art2
	eventBody, _ := json.Marshal(map[string]any{
		"payload": map[string]any{
			"articleId": art2.String(),
			"userId":    userId.String(),
			"version":   2,
		},
	})
	favCache.HandleArticleEvent("article.favorited", eventBody)

	favs, err = favCache.GetFavorited(context.Background(), userId, 2)
	if err != nil {
		t.Fatalf("GetFavorited v2: %v", err)
	}
	if _, ok := favs[art2]; !ok {
		t.Fatalf("expected art2 in favorites after event v2")
	}

	// 3. Stale event with version 1 is ignored
	staleBody, _ := json.Marshal(map[string]any{
		"payload": map[string]any{
			"articleId": art2.String(),
			"userId":    userId.String(),
			"version":   1,
		},
	})
	favCache.HandleArticleEvent("article.unfavorited", staleBody)
	favs, err = favCache.GetFavorited(context.Background(), userId, 2)
	if err != nil {
		t.Fatalf("GetFavorited: %v", err)
	}
	if _, ok := favs[art2]; !ok {
		t.Fatalf("art2 should still be favorited because stale event was ignored")
	}

	// 4. Request with minVersion 3 forces cache refresh from store
	currentVersion = 3
	store.favoritedBy[userId][art2] = struct{}{}
	favs, err = favCache.GetFavorited(context.Background(), userId, 3)
	if err != nil {
		t.Fatalf("GetFavorited v3: %v", err)
	}
	if favStore.calls < 2 {
		t.Fatalf("expected store to be called again for minVersion 3, got calls=%d", favStore.calls)
	}
}

type versionedFavStore struct {
	port    *fakeArticlesPort
	version *int64
	calls   int
}

func (v *versionedFavStore) UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, int64, error) {
	v.calls++
	favs, _, err := v.port.UserFavoritedArticles(ctx, userId)
	return favs, *v.version, err
}

func TestListPublicArticles_GetArticle(t *testing.T) {
	authorId := uuid.New()
	readerId := uuid.New()
	artId := uuid.New()

	base := &fakeArticlesPort{
		articles: []domain.Article{
			{
				Id:          artId,
				Slug:        "cached-slug",
				Title:       "Cached Title",
				Description: "Cached Desc",
				Body:        "Cached Body Content",
				TagList:     []string{"go"},
				CreatedAt:   time.Now().UTC(),
				UpdatedAt:   time.Now().UTC(),
				AuthorId:    authorId,
			},
		},
		totalCount: 1,
		favoritedBy: map[uuid.UUID]map[uuid.UUID]struct{}{
			readerId: {artId: {}},
		},
	}
	social := &fakeSocialPort{
		profiles: map[uuid.UUID]domain.Profile{
			authorId: {Id: authorId, Username: "author1"},
		},
		following: map[uuid.UUID][]uuid.UUID{
			readerId: {authorId},
		},
	}

	favCache, _ := NewManageFavorites(base, 100)
	followCache, _ := NewManageFollowing(social, 100)
	usecase := NewListPublicArticles(base, social, followCache, favCache, 10)

	// Context with logged-in user
	ctx := appctx.WithRequestorId(context.Background(), readerId)

	// 1. Get article from memory/cache
	art, profile, err := usecase.GetArticle(ctx, "cached-slug", 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if art.Slug != "cached-slug" || art.Body != "Cached Body Content" {
		t.Errorf("expected slug and body, got %v / %v", art.Slug, art.Body)
	}
	if !art.Favorited {
		t.Errorf("expected article to be favorited by reader")
	}
	if !profile.Following {
		t.Errorf("expected author to be followed by reader")
	}

	// 2. Fallback to article-service when not found in snapshot
	uncachedId := uuid.New()
	base.articles = append(base.articles, domain.Article{
		Id:          uncachedId,
		Slug:        "uncached-slug",
		Title:       "Uncached",
		Description: "Uncached Desc",
		Body:        "Fresh Body From Service",
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
		AuthorId:    authorId,
	})

	art2, _, err := usecase.GetArticle(ctx, "uncached-slug", 0, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if art2.Slug != "uncached-slug" || art2.Body != "Fresh Body From Service" {
		t.Errorf("expected fetched article, got %v / %v", art2.Slug, art2.Body)
	}

	// 3. Not found returns error
	_, _, err = usecase.GetArticle(ctx, "nonexistent-slug", 0, 0)
	if err == nil {
		t.Fatalf("expected error for nonexistent slug")
	}
}

func TestListPublicArticles_GetComments(t *testing.T) {
	authorId := uuid.New()
	readerId := uuid.New()

	base := &fakeArticlesPort{
		comments: []domain.Comment{
			{
				Id:        101,
				CreatedAt: time.Now().UTC(),
				UpdatedAt: time.Now().UTC(),
				Body:      "Great article!",
				AuthorId:  authorId,
			},
		},
	}
	social := &fakeSocialPort{
		profiles: map[uuid.UUID]domain.Profile{
			authorId: {Id: authorId, Username: "commenter1"},
		},
		following: map[uuid.UUID][]uuid.UUID{
			readerId: {authorId},
		},
	}

	favCache, _ := NewManageFavorites(base, 100)
	followCache, _ := NewManageFollowing(social, 100)
	usecase := NewListPublicArticles(base, social, followCache, favCache, 10)

	// Context with logged-in reader
	ctx := appctx.WithRequestorId(context.Background(), readerId)

	comments, profiles, err := usecase.GetComments(ctx, "cached-slug", 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(comments) != 1 || comments[0].Body != "Great article!" {
		t.Fatalf("expected 1 comment, got %+v", comments)
	}
	if p, ok := profiles[authorId]; !ok || !p.Following || p.Username != "commenter1" {
		t.Fatalf("expected hydrated following profile, got %+v", p)
	}
}


