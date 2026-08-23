<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;

readonly class GetComments
{
    public function __construct(
        private ArticleServiceInterface $articleService,
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(string $slug, ?string $requestorId): array
    {
        $comments = $this->articleService->getComments($slug, $requestorId);

        return $this->resolveAuthors($comments, $requestorId);
    }

    private function resolveAuthors(array $comments, ?string $requestorId): array
    {
        $ids = collect($comments)->pluck('authorId')->unique()->toArray();

        $profiles = $this->socialGraphService->getProfilesByIds($ids, $requestorId);

        $newComments = [];

        foreach ($comments as $comment) {
            $comment['author'] = $profiles[$comment['authorId']];
            unset($comment['authorId']);
            $newComments[] = $comment;
        }

        return $newComments;
    }
}
