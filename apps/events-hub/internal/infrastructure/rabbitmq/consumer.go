package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/guihigashi/conduit/events-hub/internal/hub"
	amqp "github.com/rabbitmq/amqp091-go"
)

type Config struct {
	URI         string
	Exchange    string
	RoutingKeys []string
}

type Consumer struct {
	cfg  Config
	hub  *hub.Hub
	conn *amqp.Connection
	ch   *amqp.Channel
}

type payloadDetails struct {
	Slug string `json:"slug"`
}

func NewConsumer(cfg Config, h *hub.Hub) (*Consumer, error) {
	conn, err := amqp.Dial(cfg.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to dial rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to open rabbitmq channel: %w", err)
	}

	// Ensure topic exchange exists
	err = ch.ExchangeDeclare(
		cfg.Exchange,
		"topic",
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,
	)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	// Declare durable queue for realtime stream (compliant with RabbitMQ 4.0)
	queueName := "events-hub.invalidation"
	q, err := ch.QueueDeclare(
		queueName,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to declare queue %s: %w", queueName, err)
	}

	for _, rk := range cfg.RoutingKeys {
		err = ch.QueueBind(
			q.Name,
			rk,
			cfg.Exchange,
			false,
			nil,
		)
		if err != nil {
			_ = ch.Close()
			_ = conn.Close()
			return nil, fmt.Errorf("failed to bind queue to exchange with key %s: %w", rk, err)
		}
	}

	return &Consumer{
		cfg:  cfg,
		hub:  h,
		conn: conn,
		ch:   ch,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) error {
	queueName := "events-hub.invalidation"
	msgs, err := c.ch.Consume(
		queueName,
		"",    // consumer tag
		true,  // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to start consuming from %s: %w", queueName, err)
	}

	slog.Info("rabbitmq consumer started", slog.String("queue", queueName))

	for {
		select {
		case <-ctx.Done():
			slog.Info("stopping rabbitmq consumer")
			_ = c.ch.Close()
			_ = c.conn.Close()
			return nil

		case d, ok := <-msgs:
			if !ok {
				slog.Warn("rabbitmq messages channel closed")
				return nil
			}

			c.handleDelivery(d.RoutingKey, d.Body)
		}
	}
}

func (c *Consumer) handleDelivery(routingKey string, body []byte) {
	slog.Debug("received rabbitmq event", slog.String("routing_key", routingKey))

	var env struct {
		EventID     string         `json:"eventId"`
		EventType   string         `json:"eventType"`
		AggregateID any            `json:"aggregateId"`
		Timestamp   time.Time      `json:"timestamp"`
		Payload     payloadDetails `json:"payload"`
	}
	if err := json.Unmarshal(body, &env); err != nil {
		slog.Warn("failed to parse event envelope", slog.Any("error", err), slog.String("body", string(body)))
		return
	}

	eventType := strings.ToUpper(strings.ReplaceAll(env.EventType, ".", "_"))
	if eventType == "" {
		eventType = strings.ToUpper(strings.ReplaceAll(routingKey, ".", "_"))
	}

	resource := determineResource(routingKey, env.EventType)

	ts := env.Timestamp
	if ts.IsZero() {
		ts = time.Now().UTC()
	}

	invalidationEvent := hub.InvalidationEvent{
		Type:      eventType,
		Resource:  resource,
		Slug:      env.Payload.Slug,
		Timestamp: ts,
	}

	slog.Info("broadcasting invalidation event",
		slog.String("type", invalidationEvent.Type),
		slog.String("resource", invalidationEvent.Resource),
		slog.String("slug", invalidationEvent.Slug),
	)

	if err := c.hub.BroadcastEvent(invalidationEvent); err != nil {
		slog.Error("failed to broadcast invalidation event", slog.Any("error", err))
	}
}

func determineResource(routingKey, eventType string) string {
	combined := routingKey + " " + eventType
	if strings.Contains(combined, "article") {
		return "articles"
	}
	if strings.Contains(combined, "comment") {
		return "comments"
	}
	if strings.Contains(combined, "user") || strings.Contains(combined, "social") {
		return "profiles"
	}
	return "general"
}
