<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Feed\UseCases\GetFeed;
use Illuminate\Http\Request;

readonly class FeedController
{
    public function __construct(
        private GetFeed $getFeedUseCase
    ) {}

    public function __invoke(Request $request)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $articles = $this->getFeedUseCase->execute($requestorId, 10, 0);

        return response()->json($articles);
    }
}
