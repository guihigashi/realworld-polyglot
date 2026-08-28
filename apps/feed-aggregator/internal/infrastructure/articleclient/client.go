package articleclient

import (
	"context"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbarticle"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/grpcutil"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/emptypb"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbarticle.ArticleServiceClient
}

func NewClient(target string) (*Client, error) {
	conn, err := grpc.NewClient(target,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithUnaryInterceptor(grpcutil.RequestorIDClientInterceptor()),
	)
	if err != nil {
		return nil, err
	}

	client := pbarticle.NewArticleServiceClient(conn)

	return &Client{
		conn:   conn,
		client: client,
	}, nil
}

func (c *Client) UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error) {
	response, err := c.client.UserFavoritedArticles(ctx, &emptypb.Empty{})
	if err != nil {
		return nil, err
	}

	ids := response.GetArticlesIds()

	m := make(map[uuid.UUID]struct{}, len(ids))
	for _, id := range ids {
		idUuid := uuid.MustParse(id)
		m[idUuid] = struct{}{}
	}

	return m, nil
}

func (c *Client) ListArticles(ctx context.Context, followingIds []uuid.UUID, limit, offset int) ([]domain.Article, int, error) {
	var followingIdsInString []string
	for i := range followingIds {
		followingIdsInString = append(followingIdsInString, followingIds[i].String())
	}

	request := &pbarticle.GetArticlesFeedRequest{
		FollowingIds: followingIdsInString,
		Limit:        int32(limit),
		Offset:       int32(offset),
	}

	res, err := c.client.GetArticlesFeed(ctx, request)
	if err != nil {
		return nil, 0, err
	}

	var articles []domain.Article
	for i := range res.Articles {
		articles = append(articles, mapToDomain(res.Articles[i]))
	}

	return articles, int(res.TotalCount), nil
}

func mapToDomain(as *pbarticle.ArticleSummary) domain.Article {
	createdAt, err := time.Parse(time.RFC3339, as.CreatedAt)
	if err != nil {
		panic(err)
	}
	updatedAt, err := time.Parse(time.RFC3339, as.UpdatedAt)
	if err != nil {
		panic(err)
	}
	return domain.Article{
		Id:             uuid.Nil(),
		Slug:           as.Slug,
		Title:          as.Title,
		Description:    as.Description,
		TagList:        as.TagList,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
		Favorited:      as.Favorited,
		FavoritesCount: int(as.FavoritesCount),
		AuthorId:       uuid.MustParse(as.AuthorId),
	}
}
