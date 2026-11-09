package rabbitmq

import (
	"context"
	"testing"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func TestConsumerReceivesMessage(t *testing.T) {
	uri := "amqp://user:secret@localhost:5672/rwa"

	// Verify RabbitMQ availability
	testConn, err := amqp.Dial(uri)
	if err != nil {
		t.Skipf("RabbitMQ not available: %v", err)
	}
	_ = testConn.Close()

	queueName := "test_feed_queue"
	routingKey := "user.logged_in"
	exchange := "test_feed_events"
	received := make(chan []byte, 1)

	cfg := Config{
		URI:      uri,
		Exchange: exchange,
		Subscriptions: []Subscription{
			{
				Queue:       queueName,
				RoutingKeys: []string{routingKey},
				Handler: func(rk string, body []byte) {
					received <- body
				},
			},
		},
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
		exchange,
		routingKey,
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

	select {
	case msg := <-received:
		if len(msg) == 0 {
			t.Fatal("expected non-empty message body in dedicated handler")
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for queue handler to be called")
	}

	// Clean up queue and exchange
	_, _ = pubCh.QueueDelete(queueName, false, false, false)
	_ = pubCh.ExchangeDelete(exchange, false, false)
}
