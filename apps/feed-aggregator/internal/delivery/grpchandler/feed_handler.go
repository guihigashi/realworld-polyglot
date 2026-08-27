package grpchandler

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/pbfeed"
	"github.com/guihigashi/conduit/feed/internal/usecase"
)

type FeedHandler struct {
	pbfeed.UnimplementedFeedServiceServer
	GenerateFeed *usecase.GenerateFeed
}

func (h *FeedHandler) GetFeed(ctx context.Context, req *pbfeed.FeedRequest) (*pbfeed.FeedResponse, error) {
	userId, err := uuid.Parse(req.GetRequestorId())
	if err != nil {
		return nil, err
	}

	feed, err := h.GenerateFeed.Execute(ctx, userId, 0, 0)
	if err != nil {
		return nil, err
	}

	res := &pbfeed.FeedResponse{
		ArticlesCount: int32(feed.ArticlesCount),
	}

	for i := range feed.Articles {
		res.Articles = append(res.Articles, mapDomainToProto(&feed.Articles[i]))
	}

	return res, nil
}

func mapDomainToProto(article *domain.Article) *pbfeed.Article {
	panic("implement me")
}
