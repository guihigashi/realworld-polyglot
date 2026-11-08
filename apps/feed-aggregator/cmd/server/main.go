package main

import (
	"context"
	"log"
	"log/slog"
	"net"
	"os"
	"strings"
	"time"

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

	manageTags := usecase.NewManageTags(articleClient)

	viper.SetDefault("articles.cache.size", 1000)
	viper.SetDefault("articles.cache.ttl", 30*time.Second)
	listPublicArticles := usecase.NewListPublicArticles(
		articleClient,
		socialClient,
		viper.GetInt("articles.cache.size"),
		viper.GetDuration("articles.cache.ttl"),
	)

	viper.SetDefault("following.cache.size", 10000)
	manageFollowing, err := usecase.NewManageFollowing(socialClient, viper.GetInt("following.cache.size"))
	if err != nil {
		slog.Error("failed to create following cache", slog.Any("error", err))
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
						manageTags.HandleArticleEvent(routingKey, body)
						if routingKey == "article.created" {
							listPublicArticles.Purge()
						}
					},
				},
				{
					Queue:       "feed-aggregator.user-events",
					RoutingKeys: []string{"user.*"},
					Handler: func(routingKey string, body []byte) {
						slog.Debug("handling user event", slog.String("routing_key", routingKey))
					},
				},
				{
					Queue:       "feed-aggregator.social-events",
					RoutingKeys: []string{"social.*"},
					Handler: func(routingKey string, body []byte) {
						slog.Debug("handling social event", slog.String("routing_key", routingKey))
						manageFollowing.HandleSocialEvent(routingKey, body)
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

	// Warm up tags from article-service in the background on startup
	go func() {
		warmCtx, warmCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer warmCancel()
		if err := manageTags.WarmUp(warmCtx); err != nil {
			slog.Warn("initial tags warmup deferred (will warm on first request)", slog.Any("error", err))
		}
	}()

	app := &usecase.GenerateFeed{
		Following: manageFollowing,
		Social:    socialClient,
		Articles:  articleClient,
	}
	grpcServer := delivery.CreateGrpcServer(app, manageTags, listPublicArticles)

	lis, err := net.Listen("tcp", ":9091")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	slog.Info("feed-aggregator listening", slog.String("address", lis.Addr().String()))
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
