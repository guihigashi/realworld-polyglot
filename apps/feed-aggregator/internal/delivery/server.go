package delivery

import (
	"github.com/guihigashi/conduit/feed/internal/generated/pbfeed"
	"github.com/guihigashi/conduit/feed/internal/usecase"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func CreateGrpcServer(generateFeed *usecase.GenerateFeed) *grpc.Server {
	opts := []grpc.ServerOption{
		grpc.ChainUnaryInterceptor(
			RequestorIdInterceptor(),
		),
	}

	s := grpc.NewServer(opts...)

	pbfeed.RegisterFeedServiceServer(s, &FeedHandler{
		GenerateFeed: generateFeed,
	})

	reflection.Register(s)

	return s
}
