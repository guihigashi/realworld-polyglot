<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;

readonly class CreateArticle
{
    public function __construct(
        private ArticleServiceInterface $articleService,
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(array $payload, string $authorId): array
    {
        $article = $this->articleService->createArticle($payload, $authorId);

        // Gateway Aggregation: Hydrate the author profile from the Social Graph Service
        $profiles = $this->socialGraphService->getProfilesByIds([$authorId], $authorId);
        $article['author'] = $profiles[$authorId];
        unset($article['authorId']);

        return $article;
    }
}
