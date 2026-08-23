<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;

readonly class AddComment
{
    public function __construct(
        private ArticleServiceInterface $articleService,
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(string $slug, array $payload, string $authorId): array
    {
        $comment = $this->articleService->addComment($slug, $payload['body'], $authorId);

        $profiles = $this->socialGraphService->getProfilesByIds([$authorId], $authorId);
        $comment['author'] = $profiles[$authorId];
        unset($comment['authorId']);

        return $comment;
    }
}
