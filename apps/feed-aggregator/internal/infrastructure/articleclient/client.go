package articleclient

import (
	"context"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbarticle"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbarticle.ArticleServiceClient
}

func (c *Client) UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error) {
	//TODO implement me
	panic("implement me")
}

func (c *Client) ListArticles(ctx context.Context, followingIds []uuid.UUID, limit, offset int, requestorId uuid.UUID) ([]domain.Article, int, error) {
	var followingIdsInString []string
	for i := range followingIds {
		followingIdsInString = append(followingIdsInString, followingIds[i].String())
	}

	request := &pbarticle.GetArticlesFeedRequest{
		FollowingIds: followingIdsInString,
		Limit:        int32(limit),
		Offset:       int32(offset),
	}

	mdCtx := metadata.AppendToOutgoingContext(ctx, "x-requestor-id", requestorId.String())

	res, err := c.client.GetArticlesFeed(mdCtx, request)
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

func NewClient(target string) (*Client, error) {
	conn, err := grpc.NewClient(target, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	client := pbarticle.NewArticleServiceClient(conn)

	return &Client{
		conn:   conn,
		client: client,
	}, nil
}
