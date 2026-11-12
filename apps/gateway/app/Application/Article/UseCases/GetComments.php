<?php

namespace App\Application\Article\UseCases;

use App\Domain\Feed\Contracts\FeedServiceInterface;

readonly class GetComments
{
    public function __construct(
        private FeedServiceInterface $feedService
    ) {}

    public function execute(string $slug, ?string $requestorId, ?int $minFollowsVersion = null): array
    {
        return $this->feedService->getComments($slug, $requestorId, $minFollowsVersion);
    }
}
