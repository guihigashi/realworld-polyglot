<?php

namespace App\Domain\Feed\Contracts;

interface FeedServiceInterface
{
    public function getFeed(int $limit, int $offset, string $requestorId): array;

    public function getTags(): array;

    /**
     * Article listing with authors already hydrated. The requestor is currently ignored by the feed-aggregator.
     *
     * @return array{articles: array, articlesCount: int}
     */
    public function listArticles(?string $tag, ?string $author, ?string $favorited, int $limit, int $offset, ?string $requestorId): array;
}
