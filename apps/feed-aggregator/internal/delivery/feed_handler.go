package delivery

import (
	"context"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbfeed"
	"github.com/guihigashi/conduit/feed/internal/usecase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type FeedHandler struct {
	pbfeed.UnimplementedFeedServiceServer
	GenerateFeed *usecase.GenerateFeed
}

func (h *FeedHandler) GetFeed(ctx context.Context, req *pbfeed.GetFeedRequest) (*pbfeed.GetFeedResponse, error) {
	userId, ok := RequestorIdFromContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "u")
	}

	feed, err := h.GenerateFeed.Execute(ctx, userId, int(req.GetLimit()), int(req.GetOffset()))
	if err != nil {
		return nil, err
	}

	res := &pbfeed.GetFeedResponse{
		ArticlesCount: int32(feed.ArticlesCount),
	}

	for i := range feed.Articles {
		res.Articles = append(res.Articles, mapDomainToProto(&feed.Articles[i], feed.Profiles))
	}

	return res, nil
}

func mapDomainToProto(article *domain.Article, authors map[uuid.UUID]domain.Profile) *pbfeed.Article {
	a := &pbfeed.Article{
		Slug:           article.Slug,
		Title:          article.Title,
		Description:    article.Description,
		TagList:        article.TagList,
		CreatedAt:      article.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      article.UpdatedAt.Format(time.RFC3339),
		Favorited:      article.Favorited,
		FavoritesCount: int32(article.FavoritesCount),
	}

	authorProfile, ok := authors[article.AuthorId]
	if ok {
		a.Author = &pbfeed.Author{
			Username:  authorProfile.Username,
			Bio:       authorProfile.Bio,
			Image:     authorProfile.Image,
			Following: false,
		}
	}

	return a
}
