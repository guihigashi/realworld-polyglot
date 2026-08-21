<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\CreateArticle;
use App\Application\Article\UseCases\DeleteArticle;
use App\Application\Article\UseCases\GetArticle;
use App\Application\Article\UseCases\ListArticles;
use App\Application\Article\UseCases\UpdateArticle;
use App\Domain\Exceptions\ResourceNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

readonly class ArticleController
{
    public function __construct(
        private CreateArticle $createArticleUseCase,
        private UpdateArticle $updateArticleUseCase,
        private GetArticle $getArticleUseCase,
        private ListArticles $listArticlesUseCase,
        private DeleteArticle $deleteArticleUseCase,
    ) {}

    public function index(Request $request)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $articles = $this->listArticlesUseCase->execute(
            tag: $request->query('tag'),
            author: $request->query('author'),
            favoritedBy: $request->query('favorited'),
            limit: (int) $request->query('limit', 20),
            offset: (int) $request->query('offset', 0),
            requestorId: $requestorId
        );

        return response()->json([
            'articles' => $articles,
            'articlesCount' => count($articles),
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $requestorId = $request->attributes->get('auth_user_id');
        try {
            $article = $this->getArticleUseCase->execute($slug, $requestorId);

            return response()->json([
                'article' => $article,
            ]);
        } catch (ResourceNotFoundException $e) {
            return response()->json([
                'errors' => [
                    'article' => [$e->getMessage()],
                ],
            ], 404);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $authorId = $request->attributes->get('auth_user_id');

        $payload = $request->validate([
            'article.title' => 'required|string',
            'article.description' => 'required|string',
            'article.body' => 'required|string',
            'article.tagList' => 'nullable|array',
            'article.tagList.*' => 'string',
        ])['article'];

        $article = $this->createArticleUseCase->execute($payload, $authorId);

        return response()->json([
            'article' => $article,
        ], 201);
    }

    public function update(Request $request, string $slug): JsonResponse
    {
        $authorId = $request->attributes->get('auth_user_id');

        $payload = $request->validate([
            'article.title' => 'sometimes|string',
            'article.description' => 'sometimes|string',
            'article.body' => 'sometimes|string',
            'article.tagList' => 'sometimes|array',
            'article.tagList.*' => 'string',
        ])['article'];

        $article = $this->updateArticleUseCase->execute($slug, $payload, $authorId);

        return response()->json([
            'article' => $article,
        ]);
    }

    public function destroy(Request $request, string $slug)
    {
        $authorId = $request->attributes->get('auth_user_id');

        $this->deleteArticleUseCase->execute($slug, $authorId);

        return response(null, 204);
    }
}
