package socialclient

import (
	"github.com/guihigashi/conduit/feed/internal/pbsocial"
	"github.com/spf13/viper"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbsocial.SocialGraphServiceClient
}

func NewClient() (*Client, error) {
	conn, err := grpc.NewClient(viper.GetString("social.target"), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		panic(err)
	}

	client := pbsocial.NewSocialGraphServiceClient(conn)

	return &Client{
		conn:   conn,
		client: client,
	}, nil
}
