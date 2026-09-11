package delivery

import (
	"github.com/grpc-ecosystem/go-grpc-middleware/v2/interceptors/recovery"
	"github.com/guihigashi/conduit/feed/internal/generated/pbfeed"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/grpcutil"
	"github.com/guihigashi/conduit/feed/internal/usecase"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/reflection"
)

func CreateGrpcServer(generateFeed *usecase.GenerateFeed) *grpc.Server {
	opts := []grpc.ServerOption{
		grpc.ChainUnaryInterceptor(
			recovery.UnaryServerInterceptor(),
			grpcutil.RequestorIdServerInterceptor(),
		),
	}

	s := grpc.NewServer(opts...)

	pbfeed.RegisterFeedServiceServer(s, &FeedHandler{
		GenerateFeed: generateFeed,
	})

	reflection.Register(s)

	healthcheck := health.NewServer()
	grpc_health_v1.RegisterHealthServer(s, healthcheck)

	return s
}
