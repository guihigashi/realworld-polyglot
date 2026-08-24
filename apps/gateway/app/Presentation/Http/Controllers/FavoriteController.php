<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\FavoriteArticle;
use App\Application\Article\UseCases\UnfavoriteArticle;
use Illuminate\Http\Request;

readonly class FavoriteController
{
    public function __construct(
        private FavoriteArticle $favoriteArticleUseCase,
        private UnfavoriteArticle $unfavoriteArticleUseCase,
    ) {}

    public function store(Request $request, string $slug)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $article = $this->favoriteArticleUseCase->execute($slug, $requestorId);

        return response()->json([
            'article' => $article,
        ]);
    }

    public function destroy(Request $request, string $slug)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $article = $this->unfavoriteArticleUseCase->execute($slug, $requestorId);

        return response()->json([
            'article' => $article,
        ]);
    }
}
