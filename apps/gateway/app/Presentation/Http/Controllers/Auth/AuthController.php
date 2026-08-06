<?php

namespace App\Presentation\Http\Controllers\Auth;

use App\Application\Auth\UseCases\RegisterUser;
use App\Presentation\Http\Requests\RegisterUserRequest;
use Illuminate\Http\JsonResponse;

class AuthController
{
    public function __construct(
        private readonly RegisterUser $registerUser
    ) {}

    public function register(RegisterUserRequest $request): JsonResponse
    {
        $payload = $request->validated('user');

        $userResponse = $this->registerUser->execute(
            username: $payload['username'],
            email: $payload['email'],
            password: $payload['password']
        );

        return response()->json([
            'user' => $userResponse,
        ], 201);
    }
}
