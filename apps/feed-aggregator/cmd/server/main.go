package main

import (
	"log"
	"log/slog"
	"net"
	"os"

	"github.com/guihigashi/conduit/feed/internal/delivery"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/articleclient"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/socialclient"
	"github.com/guihigashi/conduit/feed/internal/usecase"
	"github.com/spf13/viper"
)

func main() {
	slog.SetLogLoggerLevel(slog.LevelDebug)

	articleClient, err := articleclient.NewClient(viper.GetString("article.target"))
	if err != nil {
		slog.Error("failed to create article client", slog.Any("error", err))
		os.Exit(1)
	}
	socialClient, err := socialclient.NewClient(viper.GetString("social.target"))
	if err != nil {
		slog.Error("failed to create social client", slog.Any("error", err))
		os.Exit(1)
	}

	app := &usecase.GenerateFeed{
		Social:   socialClient,
		Articles: articleClient,
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
