<?php

namespace App\Application\Article\UseCases;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;

readonly class ListArticles
{
    public function __construct(
        private ArticleServiceInterface $articleService,
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(
        ?string $tag,
        ?string $author,
        ?string $favoritedBy,
        int $limit,
        int $offset,
        ?string $requestorId
    ): array {
        [$authorId, $favoritedById] = $this->resolveIds($author, $favoritedBy);

        $articles = $this->articleService->listArticles(
            $tag,
            $authorId,
            $favoritedById,
            $limit,
            $offset,
            $requestorId
        );

        $withAuthors = $this->resolveAuthors($articles, $requestorId);

        return $withAuthors;
    }

    private function resolveIds(?string $author, ?string $favoritedBy): array
    {
        $usernames = array_values(array_filter([$author, $favoritedBy], fn ($val) => $val !== null));

        if (empty($usernames)) {
            return [null, null];
        }

        $resolved = $this->socialGraphService->resolveIdsByUsernames($usernames);

        $resolveOrNull = function (?string $username) use ($resolved): ?string {
            return ($username !== null && isset($resolved[$username]) && $resolved[$username] !== '')
                ? $resolved[$username]
                : null;
        };

        return [
            $resolveOrNull($author),
            $resolveOrNull($favoritedBy),
        ];
    }

    private function resolveAuthors(array $articles, ?string $requestorId): array
    {
        $ids = collect($articles)->pluck('authorId')->unique()->toArray();

        $profiles = $this->socialGraphService->getProfilesByIds($ids, $requestorId);

        $newArticles = [];

        foreach ($articles as $article) {
            $article['author'] = $profiles[$article['authorId']];
            unset($article['authorId']);
            $newArticles[] = $article;
        }

        return $newArticles;
    }
}
