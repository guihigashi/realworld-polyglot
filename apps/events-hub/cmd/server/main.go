package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	deliveryHttp "github.com/guihigashi/conduit/events-hub/internal/delivery/http"
	"github.com/guihigashi/conduit/events-hub/internal/hub"
	"github.com/guihigashi/conduit/events-hub/internal/infrastructure/auth"
	"github.com/guihigashi/conduit/events-hub/internal/infrastructure/rabbitmq"
	"github.com/spf13/viper"
)

func main() {
	viper.SetConfigName("events-hub")
	viper.SetConfigType("yml")
	viper.AddConfigPath(".")

	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		slog.Error("failed to read config", slog.Any("error", err))
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Initialize In-Memory Event Hub
	eventHub := hub.NewHub()
	go eventHub.Run(ctx)

	// Initialize JWT validator
	jwtSecret := viper.GetString("jwt.secret")
	jwtValidator := auth.NewValidator(jwtSecret)

	// Initialize RabbitMQ Consumer
	rabbitURI := viper.GetString("rabbitmq.uri")
	rabbitExchange := viper.GetString("rabbitmq.exchange")
	routingKeys := []string{"read.article-*", "article.comment-*"}

	consumer, err := rabbitmq.NewConsumer(rabbitmq.Config{
		URI:         rabbitURI,
		Exchange:    rabbitExchange,
		RoutingKeys: routingKeys,
	}, eventHub)
	if err != nil {
		slog.Error("failed to create rabbitmq consumer", slog.Any("error", err))
		// We log error but proceed so HTTP server can still start and report status
	} else {
		go func() {
			if err := consumer.Start(ctx); err != nil {
				slog.Error("rabbitmq consumer error", slog.Any("error", err))
			}
		}()
	}

	// Setup HTTP Server & SSE delivery with chi
	serverHandler := deliveryHttp.NewServer(eventHub, jwtValidator)

	port := viper.GetInt("server.port")
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: serverHandler.Router(),
	}

	go func() {
		slog.Info("events-hub http server listening", slog.Int("port", port))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("http server failed", slog.Any("error", err))
			stop()
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down events-hub...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", slog.Any("error", err))
	}

	slog.Info("events-hub exited cleanly")
}
