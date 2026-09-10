<?php

namespace App\Infrastructure\Grpc;

use Grpc\Interceptor;

class TimeoutInterceptor extends Interceptor
{
    public function __construct(
        private readonly int $defaultTimeout = 3_000_000
    ) {}

    public function interceptUnaryUnary($method, $argument, $deserialize, $continuation, array $metadata = [], array $options = [])
    {
        $options['timeout'] ??= $this->defaultTimeout;

        return $continuation($method, $argument, $deserialize, $metadata, $options);
    }
}
