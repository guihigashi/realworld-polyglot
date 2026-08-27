package delivery

import (
	"context"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/pbfeed"
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
		res.Articles = append(res.Articles, mapDomainToProto(&feed.Articles[i]))
	}

	return res, nil
}

func mapDomainToProto(article *domain.Article) *pbfeed.Article {
	return &pbfeed.Article{
		Slug:           "",
		Title:          "",
		Description:    "",
		TagList:        nil,
		CreatedAt:      "",
		UpdatedAt:      "",
		Favorited:      false,
		FavoritesCount: 0,
		Author: &pbfeed.Author{
			Username:  "",
			Bio:       "",
			Image:     "",
			Following: false,
		},
	}
}
