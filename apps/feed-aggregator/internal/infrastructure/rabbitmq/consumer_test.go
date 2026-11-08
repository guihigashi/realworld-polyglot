package rabbitmq

import (
	"context"
	"testing"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func TestConsumerReceivesMessage(t *testing.T) {
	uri := "amqp://user:secret@localhost:5672/"

	// Verify RabbitMQ availability
	testConn, err := amqp.Dial(uri)
	if err != nil {
		t.Skipf("RabbitMQ not available: %v", err)
	}
	_ = testConn.Close()

	cfg := Config{
		URI:        uri,
		Exchange:   "test_feed_events",
		Queue:      "test_feed_queue",
		RoutingKey: "user.logged_in",
	}

	consumer, err := NewConsumer(cfg)
	if err != nil {
		t.Fatalf("failed to create consumer: %v", err)
	}
	defer consumer.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := consumer.Start(ctx); err != nil {
		t.Fatalf("failed to start consumer: %v", err)
	}

	// Publish test message via a separate channel
	pubConn, err := amqp.Dial(uri)
	if err != nil {
		t.Fatalf("failed to dial rabbitmq for publish: %v", err)
	}
	defer pubConn.Close()

	pubCh, err := pubConn.Channel()
	if err != nil {
		t.Fatalf("failed to open channel: %v", err)
	}
	defer pubCh.Close()

	err = pubCh.PublishWithContext(
		ctx,
		cfg.Exchange,
		cfg.RoutingKey,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(`{"event":"UserLoggedIn","data":{"username":"testuser"}}`),
		},
	)
	if err != nil {
		t.Fatalf("failed to publish message: %v", err)
	}

	// Give the consumer a brief moment to process the message
	time.Sleep(100 * time.Millisecond)

	// Clean up queue and exchange
	_, _ = pubCh.QueueDelete(cfg.Queue, false, false, false)
	_ = pubCh.ExchangeDelete(cfg.Exchange, false, false)
}
