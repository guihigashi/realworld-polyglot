<?php

namespace App\Domain\Feed\Contracts;

interface FeedServiceInterface
{
    /**
     * @return array{articles: iterable, articlesCount: int}
     */
    public function getFeed(int $limit, int $offset, string $requestorId, ?int $minFollowsVersion = null, ?int $minFavoritesVersion = null): array;

    public function getTags(): iterable;

    /**
     * Article listing with authors already hydrated.
     *
     * @return array{articles: iterable, articlesCount: int}
     */
    public function listArticles(?string $tag, ?string $author, ?string $favorited, int $limit, int $offset, ?string $requestorId, ?int $minFavoritesVersion = null): array;

    public function getArticle(string $slug, ?string $requestorId, ?int $minFavoritesVersion = null, ?int $minFollowsVersion = null): array;

    public function getComments(string $slug, ?string $requestorId, ?int $minFollowsVersion = null): array;
}
