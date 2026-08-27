package main

import (
	"log"
	"log/slog"
	"net"

	"github.com/guihigashi/conduit/feed/internal/delivery/grpchandler"
	"github.com/guihigashi/conduit/feed/internal/pbfeed"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug)

	lis, err := net.Listen("tcp", ":9091")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pbfeed.RegisterFeedServiceServer(s, &grpchandler.FeedHandler{})

	// Register reflection service on gRPC server for local testing tools
	reflection.Register(s)

	slog.Info("feed aggregator listening", slog.String("address", lis.Addr().String()))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
