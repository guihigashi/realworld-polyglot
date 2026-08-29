package socialclient

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
	"github.com/guihigashi/conduit/feed/internal/generated/pbsocial"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/grpcutil"
	"github.com/samber/lo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/protobuf/types/known/emptypb"
)

type Client struct {
	conn   *grpc.ClientConn
	client pbsocial.SocialGraphServiceClient
}

func NewClient(target string) (*Client, error) {
	conn, err := grpc.NewClient(target,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithUnaryInterceptor(grpcutil.RequestorIDClientInterceptor()),
	)
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
	resp, err := c.client.GetFollowing(ctx, &emptypb.Empty{})
	if err != nil {
		return nil, err
	}

	var followingIds []uuid.UUID
	for _, id := range resp.GetFollowingIds() {
		followingIds = append(followingIds, uuid.MustParse(id))
	}

	return followingIds, nil
}

func (c *Client) GetProfilesByIds(ctx context.Context, userIds []uuid.UUID) (map[uuid.UUID]domain.Profile, error) {
	request := &pbsocial.GetProfilesByIdsRequest{
		UserIds: lo.Map(userIds, func(item uuid.UUID, index int) string {
			return item.String()
		}),
	}

	response, err := c.client.GetProfilesByIds(ctx, request)
	if err != nil {
		return nil, err
	}

	profiles := response.GetProfiles()

	m := make(map[uuid.UUID]domain.Profile, len(profiles))

	for id, profile := range profiles {
		idUuid := uuid.MustParse(id)

		m[idUuid] = domain.Profile{
			Id:        idUuid,
			Username:  profile.GetUsername(),
			Bio:       profile.GetBio(),
			Image:     profile.GetImage(),
			Following: profile.GetFollowing(),
		}
	}

	return m, nil
}
