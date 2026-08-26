package main

import (
	"context"
	"log"
	"log/slog"
	"net"
	"time"

	"github.com/guihigashi/conduit/feed/internal/pbfeed"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type feedServer struct {
	pbfeed.UnimplementedFeedServiceServer
}

func (s *feedServer) GetFeed(ctx context.Context, req *pbfeed.FeedRequest) (*pbfeed.FeedResponse, error) {
	slog.Debug("GetFeed request received",
		slog.String("requestor", req.GetRequestorId()),
		slog.Int("limit", int(req.GetLimit())),
		slog.Int("offset", int(req.GetOffset())))

	article := &pbfeed.Article{
		Slug:            "building-a-feed-aggregator",
		Title:           "Building a Feed Aggregator",
		Description:     "A brief introduction to Go microservices.",
		Body:            "This is the full body of the mock article served by the Go backend...",
		TagList:         []string{"go", "grpc", "microservices"},
		CreatedAt:       time.Now().Format(time.RFC3339),
		UpdatedAt:       time.Now().Format(time.RFC3339),
		Favorited:       false,
		FavoritesCount:  42,
		AuthorUsername:  "jake",
		AuthorBio:       "I like to skateboard",
		AuthorImage:     "https://api.realworld.io/images/smiley-cyrus.jpeg",
		AuthorFollowing: true,
	}

	return &pbfeed.FeedResponse{
		Articles:      []*pbfeed.Article{article},
		ArticlesCount: 1,
	}, nil
}

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug)

	lis, err := net.Listen("tcp", ":9091")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pbfeed.RegisterFeedServiceServer(s, &feedServer{})

	// Register reflection service on gRPC server for local testing tools
	reflection.Register(s)

	slog.Info("feed aggregator listening", slog.String("address", lis.Addr().String()))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
