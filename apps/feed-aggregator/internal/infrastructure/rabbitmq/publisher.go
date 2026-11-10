package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Publisher interface {
	Publish(ctx context.Context, routingKey string, event any) error
	Close() error
}

type rabbitPublisher struct {
	conn     *amqp.Connection
	ch       *amqp.Channel
	exchange string
}

func NewPublisher(uri, exchange string) (Publisher, error) {
	conn, err := amqp.Dial(uri)
	if err != nil {
		return nil, fmt.Errorf("failed to dial rabbitmq for publisher: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to open rabbitmq publisher channel: %w", err)
	}

	err = ch.ExchangeDeclare(
		exchange,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	return &rabbitPublisher{
		conn:     conn,
		ch:       ch,
		exchange: exchange,
	}, nil
}

func (p *rabbitPublisher) Publish(ctx context.Context, routingKey string, event any) error {
	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	return p.ch.PublishWithContext(
		ctx,
		p.exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Timestamp:   time.Now().UTC(),
			Body:        body,
		},
	)
}

func (p *rabbitPublisher) Close() error {
	var err1, err2 error
	if p.ch != nil {
		err1 = p.ch.Close()
	}
	if p.conn != nil {
		err2 = p.conn.Close()
	}
	if err1 != nil {
		return err1
	}
	return err2
}
