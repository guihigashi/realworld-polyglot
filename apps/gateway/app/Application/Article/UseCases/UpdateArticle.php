<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;

readonly class UpdateArticle
{
    public function __construct(
        private ArticleServiceInterface $articleService,
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(string $slug, array $payload, string $authorId): array
    {
        $article = $this->articleService->updateArticle($slug, $payload, $authorId);

        $profiles = $this->socialGraphService->getProfilesByIds([$authorId], $authorId);
        $article['author'] = $profiles[$authorId];
        unset($article['authorId']);

        return $article;
    }
}
