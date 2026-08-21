<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;

readonly class DeleteArticle
{
    public function __construct(
        private ArticleServiceInterface $articleService
    ) {}

    public function execute(string $slug, string $authorId): void
    {
        $this->articleService->delete($slug, $authorId);
    }
}
