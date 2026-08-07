<?php

namespace App\Presentation\Http\Controllers\Auth;

use App\Application\Auth\UseCases\GetCurrentUser;
use App\Application\Auth\UseCases\UpdateUser;
use App\Http\Controllers\Controller;
use App\Presentation\Http\Requests\UpdateUserRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly GetCurrentUser $getCurrentUser,
        private readonly UpdateUser $updateUser,
    ) {}

    public function show(Request $request)
    {
        // Retrieve the ID attached by the JwtAuthenticationMiddleware
        $userId = $request->attributes->get('auth_user_id');

        try {
            $userResponse = $this->getCurrentUser->execute($userId);

            return response()->json([
                'user' => $userResponse,
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'User not found'], 404);
        }
    }

    public function update(UpdateUserRequest $request): JsonResponse
    {
        $userId = $request->attributes->get('auth_user_id');
        $payload = $request->validated('user');

        try {
            $userResponse = $this->updateUser->execute($userId, $payload);

            return response()->json([
                'user' => $userResponse,
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['message' => 'User not found'], 404);
        }
    }
}
