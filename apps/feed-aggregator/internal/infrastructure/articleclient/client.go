package articleclient

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbarticle"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbarticle.ArticleServiceClient
}

func (c *Client) UserFavoritedArticles(ctx context.Context, userId uuid.UUID) (map[uuid.UUID]struct{}, error) {
	//TODO implement me
	panic("implement me")
}

func (c *Client) ListArticles(ctx context.Context, followingIds []uuid.UUID, limit, offset int) ([]domain.Article, error) {
	//TODO implement me
	panic("implement me")
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
