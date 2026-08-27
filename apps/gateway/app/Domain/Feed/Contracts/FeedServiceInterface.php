<?php

namespace App\Domain\Feed\Contracts;

interface FeedServiceInterface
{
    public function getFeed(string $requestorId, int $limit, int $offset): array;
}
