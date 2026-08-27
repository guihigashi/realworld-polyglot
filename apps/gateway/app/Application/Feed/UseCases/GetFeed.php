<?php

namespace App\Application\Feed\UseCases;

use App\Domain\Feed\Contracts\FeedServiceInterface;

readonly class GetFeed
{
    public function __construct(
        private FeedServiceInterface $feedService
    ) {}

    public function execute(string $requestorId, int $limit, int $offset): array
    {
        return $this->feedService->getFeed($requestorId, $limit, $offset);
    }
}
