<?php

namespace App\Infrastructure\Messaging;

use App\Domain\Contracts\EventPublisherInterface;

class InMemoryEventPublisher implements EventPublisherInterface
{
    /** @var array<int, array{routing_key: string, payload: array<string, mixed>}> */
    private array $events = [];

    public function publish(string $routingKey, array $payload): void
    {
        $this->events[] = [
            'routing_key' => $routingKey,
            'payload' => $payload,
        ];
    }

    /**
     * @return array<int, array{routing_key: string, payload: array<string, mixed>}>
     */
    public function getEvents(): array
    {
        return $this->events;
    }

    public function count(): int
    {
        return count($this->events);
    }
}
