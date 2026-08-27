package articleclient

import (
	"github.com/guihigashi/conduit/feed/internal/pbarticle"
	"github.com/spf13/viper"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbarticle.ArticleServiceClient
}

func NewClient() (*Client, error) {
	conn, err := grpc.NewClient(viper.GetString("article.target"), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		panic(err)
	}

	client := pbarticle.NewArticleServiceClient(conn)

	return &Client{
		conn:   conn,
		client: client,
	}, nil
}
