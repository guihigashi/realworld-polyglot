package rabbitmq

import (
	"context"
	"fmt"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Config struct {
	URI        string
	Exchange   string
	Queue      string
	RoutingKey string
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

	// Declare durable queue
	q, err := ch.QueueDeclare(
		cfg.Queue,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to declare queue: %w", err)
	}

	// Bind queue to exchange with routing key
	err = ch.QueueBind(
		q.Name,
		cfg.RoutingKey,
		cfg.Exchange,
		false,
		nil,
	)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to bind queue to exchange: %w", err)
	}

	return &Consumer{
		cfg:  cfg,
		conn: conn,
		ch:   ch,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) error {
	msgs, err := c.ch.Consume(
		c.cfg.Queue,
		"",    // consumer tag
		true,  // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	if err != nil {
		return fmt.Errorf("failed to register consumer: %w", err)
	}

	slog.Info("rabbitmq consumer started",
		slog.String("queue", c.cfg.Queue),
		slog.String("exchange", c.cfg.Exchange),
		slog.String("routing_key", c.cfg.RoutingKey),
	)

	go func() {
		for {
			select {
			case <-ctx.Done():
				slog.Info("stopping rabbitmq consumer")
				return
			case d, ok := <-msgs:
				if !ok {
					slog.Warn("rabbitmq messages channel closed")
					return
				}
				slog.Info("received event from rabbitmq",
					slog.String("routing_key", d.RoutingKey),
					slog.String("body", string(d.Body)),
				)
			}
		}
	}()

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
