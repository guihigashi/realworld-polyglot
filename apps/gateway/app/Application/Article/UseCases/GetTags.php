<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;

class GetTags
{
    public function __construct(
        private readonly ArticleServiceInterface $articleService
    ) {}

    public function execute(): array
    {
        return $this->articleService->getTags();
    }
}
