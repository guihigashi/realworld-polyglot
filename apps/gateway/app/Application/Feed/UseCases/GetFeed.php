<?php

namespace App\Application\Feed\UseCases;

use App\Domain\Feed\Contracts\FeedServiceInterface;

readonly class GetFeed
{
    public function __construct(
        private FeedServiceInterface $feedService
    ) {}

    public function execute(int $limit, int $offset, string $requestorId): array
    {
        return $this->feedService->getFeed($limit, $offset, $requestorId);
    }
}
