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

	// RabbitMQ Event Consumer (code-driven subscriptions over a single connection)
	rabbitmqURI := viper.GetString("rabbitmq.uri")
	if rabbitmqURI != "" {
		consumer, err := rabbitmq.NewConsumer(rabbitmq.Config{
			URI:      rabbitmqURI,
			Exchange: viper.GetString("rabbitmq.exchange"),
			Subscriptions: []rabbitmq.Subscription{
				{
					Queue:       "feed-aggregator.article-events",
					RoutingKeys: []string{"article.*"},
					Handler: func(routingKey string, body []byte) {
						slog.Debug("handling article event", slog.String("routing_key", routingKey))
					},
				},
				{
					Queue:       "feed-aggregator.user-events",
					RoutingKeys: []string{"user.*"},
					Handler: func(routingKey string, body []byte) {
						slog.Debug("handling user event", slog.String("routing_key", routingKey))
					},
				},
			},
		})
		if err != nil {
			slog.Error("failed to create rabbitmq consumer", slog.Any("error", err))
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
