package main

import (
	"context"
	"encoding/json"
	"log"
	"log/slog"
	"net"
	"os"
	"strings"
	"time"
	"uuid"

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

	viper.SetDefault("following.cache.size", 10000)
	manageFollowing, err := usecase.NewManageFollowing(socialClient, viper.GetInt("following.cache.size"))
	if err != nil {
		slog.Error("failed to create following cache", slog.Any("error", err))
		os.Exit(1)
	}

	viper.SetDefault("favorites.cache.size", 10000)
	manageFavorites, err := usecase.NewManageFavorites(articleClient, viper.GetInt("favorites.cache.size"))
	if err != nil {
		slog.Error("failed to create favorites cache", slog.Any("error", err))
		os.Exit(1)
	}

	viper.SetDefault("articles.cache.size", 1000)
	listPublicArticles := usecase.NewListPublicArticles(
		articleClient,
		socialClient,
		manageFollowing,
		manageFavorites,
		viper.GetInt("articles.cache.size"),
	)

	// RabbitMQ Event Consumer & Publisher (code-driven subscriptions and invalidation publishing)
	rabbitmqURI := viper.GetString("rabbitmq.uri")
	if rabbitmqURI != "" {
		rabbitExchange := viper.GetString("rabbitmq.exchange")
		publisher, err := rabbitmq.NewPublisher(rabbitmqURI, rabbitExchange)
		if err != nil {
			slog.Error("failed to create rabbitmq publisher", slog.Any("error", err))
		} else {
			defer publisher.Close()
			listPublicArticles.SetPublisher(publisher)
			slog.Info("rabbitmq publisher initialized for feed-aggregator")
		}

		consumer, err := rabbitmq.NewConsumer(rabbitmq.Config{
			URI:      rabbitmqURI,
			Exchange: rabbitExchange,
			Subscriptions: []rabbitmq.Subscription{
				{
					Queue:       "feed-aggregator.article-events",
					RoutingKeys: []string{"article.*"},
					Handler: func(routingKey string, body []byte) {
						slog.Debug("handling article event", slog.String("routing_key", routingKey))
						manageTags.HandleArticleEvent(routingKey, body)
						listPublicArticles.HandleArticleEvent(routingKey, body)
						manageFavorites.HandleArticleEvent(routingKey, body)
					},
				},
				{
					Queue:       "feed-aggregator.user-events",
					RoutingKeys: []string{"user.*"},
					Handler: func(routingKey string, body []byte) {
						slog.Debug("handling user event", slog.String("routing_key", routingKey))
						if routingKey != "user.logged_in" {
							return
						}
						var ev struct {
							Data struct {
								UserId uuid.UUID `json:"user_id"`
							} `json:"data"`
						}
						if err := json.Unmarshal(body, &ev); err != nil || ev.Data.UserId == uuid.Nil() {
							return
						}
						warmCtx, warmCancel := context.WithTimeout(context.Background(), 10*time.Second)
						defer warmCancel()
						_, _ = manageFollowing.GetFollowing(warmCtx, ev.Data.UserId, 0)
						_, _ = manageFavorites.GetFavorited(warmCtx, ev.Data.UserId)
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

	// Warm up tags and newest articles from article-service in the background on startup
	go func() {
		warmCtx, warmCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer warmCancel()
		if err := manageTags.WarmUp(warmCtx); err != nil {
			slog.Warn("initial tags warmup deferred (will warm on first request)", slog.Any("error", err))
		}
		if err := listPublicArticles.WarmUp(warmCtx); err != nil {
			slog.Warn("initial articles warmup deferred (will warm on first request)", slog.Any("error", err))
		}
	}()

	app := &usecase.GenerateFeed{
		Following:      manageFollowing,
		Favorites:      manageFavorites,
		Social:         socialClient,
		Articles:       articleClient,
		NewestArticles: listPublicArticles,
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
