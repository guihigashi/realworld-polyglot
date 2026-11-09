<?php

use App\Infrastructure\Messaging\RabbitMqEventPublisher;
use PhpAmqpLib\Connection\AMQPStreamConnection;

it('publishes and delivers message to rabbitmq exchange and bound queue', function () {
    $config = config('rabbitmq');

    try {
        $connection = new AMQPStreamConnection(
            $config['host'],
            $config['port'],
            $config['user'],
            $config['password'],
            $config['vhost'],
            connection_timeout: 2.0,
            read_write_timeout: 2.0
        );
    } catch (Throwable $e) {
        test()->markTestSkipped('RabbitMQ not available: '.$e->getMessage());
    }

    $channel = $connection->channel();
    $exchangeName = 'test_events_'.uniqid();
    $queueName = 'test_queue_'.uniqid();
    $routingKey = 'user.logged_in';

    $channel->exchange_declare($exchangeName, 'topic', false, true, false);
    $channel->queue_declare($queueName, false, true, false, false);
    $channel->queue_bind($queueName, $exchangeName, $routingKey);

    $publisher = new RabbitMqEventPublisher(
        host: $config['host'],
        port: $config['port'],
        user: $config['user'],
        password: $config['password'],
        vhost: $config['vhost'],
        exchange: $exchangeName,
    );

    $testPayload = [
        'event' => 'UserLoggedIn',
        'occurred_at' => (new DateTimeImmutable)->format(DateTimeInterface::ATOM),
        'data' => [
            'user_id' => '123',
            'email' => 'test@example.com',
            'username' => 'testuser',
        ],
    ];

    $publisher->publish($routingKey, $testPayload);

    // Wait slightly for broker routing
    $message = null;
    for ($i = 0; $i < 10; $i++) {
        usleep(20000); // 20ms
        $message = $channel->basic_get($queueName, true);
        if ($message !== null) {
            break;
        }
    }

    expect($message)->not->toBeNull();
    $receivedPayload = json_decode($message->getBody(), true, 512, JSON_THROW_ON_ERROR);
    expect($receivedPayload)->toBe($testPayload);
    expect($message->get('content_type'))->toBe('application/json');

    $channel->queue_delete($queueName);
    $channel->exchange_delete($exchangeName);
    $channel->close();
    $connection->close();
});
