<?php

namespace App\Domain\Feed\Contracts;

interface FeedServiceInterface
{
    public function getFeed(int $limit, int $offset, string $requestorId): array;
}
