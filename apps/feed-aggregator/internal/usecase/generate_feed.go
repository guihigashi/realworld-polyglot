package usecase

import (
	"context"
	"uuid"

	"github.com/samber/lo"

	"github.com/guihigashi/conduit/feed/internal/domain"
)

type Following interface {
	GetFollowing(ctx context.Context, userId uuid.UUID, minVersion int64) ([]uuid.UUID, error)
}

type Social interface {
	GetProfilesByIds(ctx context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error)
}

type Articles interface {
	ListArticles(ctx context.Context, followingIds []uuid.UUID, limit, offset int) ([]domain.Article, int, error)
	UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error)
}

type NewestArticlesWindow interface {
	ListByAuthors(ctx context.Context, authorIds []uuid.UUID, limit, offset int) ([]domain.Article, int, bool, error)
}

type GenerateFeed struct {
	Following      Following
	Favorites      Favorites
	Social         Social
	Articles       Articles
	NewestArticles NewestArticlesWindow
}

type Feed struct {
	Articles      []domain.Article
	ArticlesCount int
	Profiles      map[uuid.UUID]domain.Profile
}

func (f *GenerateFeed) Execute(ctx context.Context, userId uuid.UUID, limit, offset int, minFollowsVersion int64) (*Feed, error) {
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 {
		limit = defaultPageLimit
	}

	followingIds, err := f.Following.GetFollowing(ctx, userId, minFollowsVersion)
	if err != nil {
		return nil, err
	}

	if len(followingIds) == 0 {
		return &Feed{
			Articles:      []domain.Article{},
			ArticlesCount: 0,
			Profiles:      nil,
		}, nil
	}

	var (
		articles      []domain.Article
		articlesCount int
		fromCache     bool
	)
	if f.NewestArticles != nil {
		articles, articlesCount, fromCache, err = f.NewestArticles.ListByAuthors(ctx, followingIds, limit, offset)
		if err != nil {
			return nil, err
		}
	}
	if !fromCache {
		articles, articlesCount, err = f.Articles.ListArticles(ctx, followingIds, limit, offset)
		if err != nil {
			return nil, err
		}
	}

	if len(articles) == 0 {
		return &Feed{
			Articles:      []domain.Article{},
			ArticlesCount: articlesCount,
			Profiles:      nil,
		}, nil
	}

	authorsIds := lo.UniqMap(articles, func(item domain.Article, index int) uuid.UUID {
		return item.AuthorId
	})

	rawProfiles, err := f.Social.GetProfilesByIds(ctx, authorsIds)
	if err != nil {
		return nil, err
	}
	profiles := make(map[uuid.UUID]domain.Profile, len(rawProfiles))
	for id, p := range rawProfiles {
		p.Following = true
		profiles[id] = p
	}

	var userFavorited map[uuid.UUID]struct{}
	if f.Favorites != nil {
		userFavorited, err = f.Favorites.GetFavorited(ctx, userId)
	} else {
		userFavorited, err = f.Articles.UserFavoritedArticles(ctx, userId)
	}
	if err != nil {
		return nil, err
	}

	for i := range articles {
		_, articles[i].Favorited = userFavorited[articles[i].Id]
	}

	return &Feed{
		Articles:      articles,
		ArticlesCount: articlesCount,
		Profiles:      profiles,
	}, nil
}
