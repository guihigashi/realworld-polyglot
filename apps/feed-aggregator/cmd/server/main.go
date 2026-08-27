package main

import (
	"log"
	"log/slog"
	"net"

	"github.com/guihigashi/conduit/feed/internal/delivery"
	"github.com/guihigashi/conduit/feed/internal/usecase"
)

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug)

	app := &usecase.GenerateFeed{
		Social:   nil,
		Articles: nil,
	}
	grpcServer := delivery.CreateGrpcServer(app)

	lis, err := net.Listen("tcp", ":9091")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	slog.Info("feed-aggregator listening", slog.String("address", lis.Addr().String()))
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
