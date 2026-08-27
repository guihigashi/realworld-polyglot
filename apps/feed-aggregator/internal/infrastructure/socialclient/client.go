package socialclient

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbsocial"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbsocial.SocialGraphServiceClient
}

func NewClient(target string) (*Client, error) {
	conn, err := grpc.NewClient(target, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	client := pbsocial.NewSocialGraphServiceClient(conn)

	return &Client{
		conn:   conn,
		client: client,
	}, nil
}

func (c *Client) GetFollowing(ctx context.Context, userId uuid.UUID) ([]uuid.UUID, error) {
	//TODO implement me
	panic("implement me")
}

func (c *Client) GetProfilesByIds(ctx context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error) {
	//TODO implement me
	panic("implement me")
}
