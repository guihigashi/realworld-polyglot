<?php

namespace App\Domain\Contracts;

interface EventPublisherInterface
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function publish(string $routingKey, array $payload): void;
}
