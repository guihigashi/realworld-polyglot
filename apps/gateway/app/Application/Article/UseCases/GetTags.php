<?php

namespace App\Application\Article\UseCases;

use App\Domain\Feed\Contracts\FeedServiceInterface;

class GetTags
{
    public function __construct(
        private readonly FeedServiceInterface $feedService
    ) {}

    public function execute(): array
    {
        return $this->feedService->getTags();
    }
}
