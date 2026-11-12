<?php

namespace App\Application\Article\UseCases;

use App\Domain\Feed\Contracts\FeedServiceInterface;

readonly class GetArticle
{
    public function __construct(
        private FeedServiceInterface $feedService
    ) {}

    public function execute(string $slug, ?string $requestorId, ?int $minFavoritesVersion = null, ?int $minFollowsVersion = null): array
    {
        return $this->feedService->getArticle($slug, $requestorId, $minFavoritesVersion, $minFollowsVersion);
    }
}
