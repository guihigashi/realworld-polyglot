package main

import (
	"context"
	"log"
	"log/slog"
	"net"
	"os"
	"strings"

	"github.com/guihigashi/conduit/feed/internal/delivery"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/articleclient"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/rabbitmq"
	"github.com/guihigashi/conduit/feed/internal/infrastructure/socialclient"
	"github.com/guihigashi/conduit/feed/internal/usecase"
	"github.com/spf13/viper"
)

func main() {
	viper.SetConfigName("feed-aggregator")
	viper.SetConfigType("yml")
	viper.AddConfigPath(".")

	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	viper.SetDefault("rabbitmq.uri", "amqp://user:secret@localhost:5672/")
	viper.SetDefault("rabbitmq.exchange", "events")
	viper.SetDefault("rabbitmq.queue", "feed-aggregator.user-events")
	viper.SetDefault("rabbitmq.routing_key", "user.logged_in")

	err := viper.ReadInConfig()
	if err != nil {
		slog.Error("failed to read config", slog.Any("error", err))
		os.Exit(1)
	}

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

	// RabbitMQ Event Consumer
	rabbitmqURI := viper.GetString("rabbitmq.uri")
	if rabbitmqURI != "" {
		consumer, err := rabbitmq.NewConsumer(rabbitmq.Config{
			URI:        rabbitmqURI,
			Exchange:   viper.GetString("rabbitmq.exchange"),
			Queue:      viper.GetString("rabbitmq.queue"),
			RoutingKey: viper.GetString("rabbitmq.routing_key"),
		})
		if err != nil {
			slog.Error("failed to connect rabbitmq consumer", slog.Any("error", err))
			os.Exit(1)
		}
		defer consumer.Close()

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		if err := consumer.Start(ctx); err != nil {
			slog.Error("failed to start rabbitmq consumer", slog.Any("error", err))
			os.Exit(1)
		}
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
