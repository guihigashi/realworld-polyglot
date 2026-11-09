package rabbitmq

import (
	"context"
	"fmt"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Handler func(routingKey string, body []byte)

type Subscription struct {
	Queue       string
	RoutingKeys []string
	Handler     Handler
}

type Config struct {
	URI           string
	Exchange      string
	Subscriptions []Subscription
}

type Consumer struct {
	cfg  Config
	conn *amqp.Connection
	ch   *amqp.Channel
}

func NewConsumer(cfg Config) (*Consumer, error) {
	conn, err := amqp.Dial(cfg.URI)
	if err != nil {
		return nil, fmt.Errorf("failed to dial rabbitmq: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to open rabbitmq channel: %w", err)
	}

	// Ensure exchange exists
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

	for _, sub := range cfg.Subscriptions {
		q, err := ch.QueueDeclare(
			sub.Queue,
			true,  // durable
			false, // delete when unused
			false, // exclusive
			false, // no-wait
			nil,
		)
		if err != nil {
			_ = ch.Close()
			_ = conn.Close()
			return nil, fmt.Errorf("failed to declare queue %s: %w", sub.Queue, err)
		}

		for _, rk := range sub.RoutingKeys {
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
				return nil, fmt.Errorf("failed to bind queue %s to exchange with key %s: %w", sub.Queue, rk, err)
			}
		}
	}

	return &Consumer{
		cfg:  cfg,
		conn: conn,
		ch:   ch,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) error {
	for _, sub := range c.cfg.Subscriptions {
		msgs, err := c.ch.Consume(
			sub.Queue,
			"",    // consumer tag
			true,  // auto-ack
			false, // exclusive
			false, // no-local
			false, // no-wait
			nil,   // args
		)
		if err != nil {
			return fmt.Errorf("failed to register consumer for %s: %w", sub.Queue, err)
		}

		slog.Info("rabbitmq queue consumer started",
			slog.String("queue", sub.Queue),
			slog.String("exchange", c.cfg.Exchange),
		)

		go func(s Subscription, deliveries <-chan amqp.Delivery) {
			for {
				select {
				case <-ctx.Done():
					slog.Info("stopping rabbitmq consumer", slog.String("queue", s.Queue))
					return
				case d, ok := <-deliveries:
					if !ok {
						slog.Warn("rabbitmq messages channel closed", slog.String("queue", s.Queue))
						return
					}
					slog.Info("received event from rabbitmq",
						slog.String("queue", s.Queue),
						slog.String("routing_key", d.RoutingKey),
						slog.String("body", string(d.Body)),
					)
					if s.Handler != nil {
						s.Handler(d.RoutingKey, d.Body)
					}
				}
			}
		}(sub, msgs)
	}

	return nil
}

func (c *Consumer) Close() error {
	if c.ch != nil {
		_ = c.ch.Close()
	}
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}
