<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;

readonly class FavoriteArticle
{
    public function __construct(
        private ArticleServiceInterface $articleService,
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(string $slug, string $requestorId): array
    {
        $article = $this->articleService->favoriteArticle($slug, $requestorId);

        // Gateway Aggregation: Hydrate the author profile from the Social Graph Service
        if (! empty($article['authorId'])) {
            $profiles = $this->socialGraphService->getProfilesByIds([$article['authorId']], $requestorId);

            $article['author'] = $profiles[$article['authorId']];
        }
        unset($article['authorId']);

        return $article;
    }
}
