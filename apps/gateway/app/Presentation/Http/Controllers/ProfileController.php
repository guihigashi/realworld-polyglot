<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Profile\UseCases\FollowUser;
use App\Application\Profile\UseCases\GetProfile;
use App\Application\Profile\UseCases\UnfollowUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        private readonly GetProfile $getProfile,
        private readonly FollowUser $followUser,
        private readonly UnfollowUser $unfollowUser,
    ) {}

    public function show(Request $request, string $username): JsonResponse
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $profile = $this->getProfile->execute($username, $requestorId);

        return response()->json([
            'profile' => $profile->toArray(),
        ]);
    }

    public function follow(Request $request, string $username): JsonResponse
    {
        $followerId = $request->attributes->get('auth_user_id');

        $profile = $this->followUser->execute($followerId, $username);

        return response()->json([
            'profile' => $profile->toArray(),
        ]);
    }

    public function unfollow(Request $request, string $username): JsonResponse
    {
        $followerId = $request->attributes->get('auth_user_id');

        $profile = $this->unfollowUser->execute($followerId, $username);

        return response()->json([
            'profile' => $profile->toArray(),
        ]);
    }
}
