<?php

namespace App\Application\Article\UseCases;

use App\Domain\Feed\Contracts\FeedServiceInterface;

readonly class ListArticles
{
    public function __construct(
        private FeedServiceInterface $feedService
    ) {}

    /**
     * Public article listing served (and cached) by the feed-aggregator.
     * The requestor is forwarded, but the feed-aggregator currently ignores it: favorited/following are always false.
     */
    public function execute(
        ?string $tag,
        ?string $author,
        ?string $favoritedBy,
        int $limit,
        int $offset,
        ?string $requestorId,
    ): array {
        return $this->feedService->listArticles($tag, $author, $favoritedBy, $limit, $offset, $requestorId);
    }
}
