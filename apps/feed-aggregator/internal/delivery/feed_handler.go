package delivery

import (
	"context"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/appctx"
	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbfeed"
	"github.com/guihigashi/conduit/feed/internal/usecase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type FeedHandler struct {
	pbfeed.UnimplementedFeedServiceServer
	GenerateFeed       *usecase.GenerateFeed
	ManageTags         *usecase.ManageTags
	ListPublicArticles *usecase.ListPublicArticles
}

func (h *FeedHandler) GetTags(ctx context.Context, _ *emptypb.Empty) (*pbfeed.GetTagsResponse, error) {
	tags, err := h.ManageTags.GetTags(ctx)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	res := &pbfeed.GetTagsResponse{
		Tags: make([]*pbfeed.CountedTag, len(tags)),
	}
	for i, t := range tags {
		res.Tags[i] = &pbfeed.CountedTag{
			Tag:   t.Tag,
			Count: int32(t.Count),
		}
	}
	return res, nil
}

// ListArticles serves the public article listing. The requestor is intentionally ignored:
// favorited and following are always false.
func (h *FeedHandler) ListArticles(ctx context.Context, req *pbfeed.ListArticlesRequest) (*pbfeed.ListArticlesResponse, error) {
	page, err := h.ListPublicArticles.Execute(ctx, usecase.ListArticlesQuery{
		Tag:       req.GetTag(),
		Author:    req.GetAuthor(),
		Favorited: req.GetFavorited(),
		Limit:     int(req.GetLimit()),
		Offset:    int(req.GetOffset()),
	})
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	res := &pbfeed.ListArticlesResponse{
		Articles:      make([]*pbfeed.Article, 0, len(page.Articles)),
		ArticlesCount: int32(page.ArticlesCount),
	}
	for i := range page.Articles {
		res.Articles = append(res.Articles, mapDomainToProto(&page.Articles[i], page.Profiles, false))
	}

	return res, nil
}

func (h *FeedHandler) GetFeed(ctx context.Context, req *pbfeed.GetFeedRequest) (*pbfeed.GetFeedResponse, error) {
	userId, ok := appctx.RequestorIdFromContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "unauthenticated")
	}

	feed, err := h.GenerateFeed.Execute(ctx, userId, int(req.GetLimit()), int(req.GetOffset()))
	if err != nil {
		return nil, err
	}

	res := &pbfeed.GetFeedResponse{
		ArticlesCount: int32(feed.ArticlesCount),
	}

	for i := range feed.Articles {
		res.Articles = append(res.Articles, mapDomainToProto(&feed.Articles[i], feed.Profiles, true))
	}

	return res, nil
}

func mapDomainToProto(article *domain.Article, authors map[uuid.UUID]domain.Profile, following bool) *pbfeed.Article {
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

	if authorProfile, ok := authors[article.AuthorId]; ok {
		a.Author = &pbfeed.Author{
			Username:  authorProfile.Username,
			Bio:       authorProfile.Bio,
			Image:     authorProfile.Image,
			Following: following,
		}
	}

	return a
}
