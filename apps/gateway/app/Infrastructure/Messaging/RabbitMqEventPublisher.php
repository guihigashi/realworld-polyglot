<?php

namespace App\Infrastructure\Messaging;

use App\Domain\Contracts\EventPublisherInterface;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;

class RabbitMqEventPublisher implements EventPublisherInterface
{
    private ?AMQPStreamConnection $connection = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $user,
        private readonly string $password,
        private readonly string $vhost = 'rwa',
        private readonly string $exchange = 'events',
    ) {}

    public function publish(string $routingKey, array $payload): void
    {
        $channel = $this->getChannel();

        $channel->exchange_declare(
            exchange: $this->exchange,
            type: 'topic',
            passive: false,
            durable: true,
            auto_delete: false
        );

        $body = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

        $msg = new AMQPMessage($body, [
            'content_type' => 'application/json',
            'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT,
        ]);

        $channel->basic_publish($msg, $this->exchange, $routingKey);
    }

    private function getChannel(): AMQPChannel
    {
        if ($this->connection === null || ! $this->connection->isConnected()) {
            $this->connection = new AMQPStreamConnection(
                host: $this->host,
                port: $this->port,
                user: $this->user,
                password: $this->password,
                vhost: $this->vhost,
                insist: false,
                login_method: 'AMQPLAIN',
                login_response: null,
                locale: 'en_US',
                connection_timeout: 3.0,
                read_write_timeout: 3.0,
                context: null,
                keepalive: false,
                heartbeat: 0
            );
        }

        return $this->connection->channel();
    }

    public function __destruct()
    {
        try {
            if ($this->connection !== null && $this->connection->isConnected()) {
                $this->connection->close();
            }
        } catch (\Throwable) {
            // Ignore connection errors on shutdown
        }
    }
}
