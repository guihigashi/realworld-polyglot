<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;

readonly class DeleteComment
{
    public function __construct(
        private ArticleServiceInterface $articleService,
    ) {}

    public function execute(string $slug, int $id, string $requestorId): void
    {
        $this->articleService->deleteComment($slug, $id, $requestorId);
    }
}
