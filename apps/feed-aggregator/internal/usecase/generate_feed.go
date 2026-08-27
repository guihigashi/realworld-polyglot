package usecase

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
)

type Social interface {
	GetFollowing(ctx context.Context, userId uuid.UUID) ([]uuid.UUID, error)
	GetProfilesByIds(ctx context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error)
}
type Articles interface {
	ListArticles(ctx context.Context, followingIds []uuid.UUID, limit, offset int) ([]domain.Article, error)
	UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error)
}

type GenerateFeed struct {
	Social   Social
	Articles Articles
}

type Feed struct {
	Articles      []domain.Article
	ArticlesCount int
	Profiles      map[uuid.UUID]domain.Profile
}

func (f *GenerateFeed) Execute(ctx context.Context, userId uuid.UUID, limit, offset int) (*Feed, error) {
	followingIds, err := f.Social.GetFollowing(ctx, userId)
	if err != nil {
		return nil, err
	}

	articles, err := f.Articles.ListArticles(ctx, followingIds, limit, offset)
	if err != nil {
		return nil, err
	}

	profiles, err := f.Social.GetProfilesByIds(ctx, followingIds)
	if err != nil {
		return nil, err
	}

	userFavorited, err := f.Articles.UserFavoritedArticles(ctx, userId)
	if err != nil {
		return nil, err
	}

	for i := range articles {
		_, ok := userFavorited[articles[i].Id]
		if ok {
			articles[i].Favorited = true
		}
	}

	return &Feed{
		Articles:      articles,
		ArticlesCount: len(articles),
		Profiles:      profiles,
	}, nil
}
