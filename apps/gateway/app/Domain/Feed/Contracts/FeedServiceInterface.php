<?php

namespace App\Domain\Feed\Contracts;

interface FeedServiceInterface
{
    /**
     * @return array{articles: iterable, articlesCount: int}
     */
    public function getFeed(int $limit, int $offset, string $requestorId, ?int $minFollowsVersion = null): array;

    public function getTags(): iterable;

    /**
     * Article listing with authors already hydrated. The requestor is currently ignored by the feed-aggregator.
     *
     * @return array{articles: iterable, articlesCount: int}
     */
    public function listArticles(?string $tag, ?string $author, ?string $favorited, int $limit, int $offset, ?string $requestorId): array;
}
