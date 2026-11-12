<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Feed\UseCases\GetFeed;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;

readonly class FeedController
{
    public function __construct(
        private GetFeed $getFeedUseCase
    ) {}

    public function __invoke(Request $request): StreamedJsonResponse
    {
        $requestorId = $request->attributes->get('auth_user_id');
        $minFollowsVersion = $request->header('X-Follows-Version');
        $minFavoritesVersion = $request->header('X-Favorites-Version');

        $articles = $this->getFeedUseCase->execute(
            $request->query('limit', 20),
            $request->query('offset', 0),
            $requestorId,
            $minFollowsVersion !== null ? (int) $minFollowsVersion : null,
            $minFavoritesVersion !== null ? (int) $minFavoritesVersion : null
        );

        return response()->streamJson($articles);
    }
}
