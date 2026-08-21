<?php

namespace App\Domain\Article\Contracts;

interface ArticleServiceInterface
{
    public function getArticle(string $slug, ?string $requestorId): array;

    public function listArticles(?string $tag, ?string $authorId, ?string $favoritedById, int $limit, int $offset, ?string $requestorId): array;

    public function createArticle(array $payload, string $authorId): array;

    public function updateArticle(string $slug, array $payload, string $authorId): array;

    public function getTags(): array;

    public function delete(string $slug, string $authorId): void;
}
