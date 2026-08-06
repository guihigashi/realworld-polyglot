<?php

namespace App\Presentation\Http\Controllers\Auth;

use App\Application\Auth\UseCases\LoginUser;
use App\Application\Auth\UseCases\RegisterUser;
use App\Presentation\Http\Requests\LoginUserRequest;
use App\Presentation\Http\Requests\RegisterUserRequest;
use Illuminate\Http\JsonResponse;

class AuthController
{
    public function __construct(
        private readonly LoginUser $loginUser,
        private readonly RegisterUser $registerUser
    ) {}

    public function login(LoginUserRequest $request): JsonResponse
    {
        $payload = $request->validated('user');

        try {
            $userResponse = $this->loginUser->execute(
                email: $payload['email'],
                password: $payload['password']
            );

            return response()->json([
                'user' => $userResponse,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'errors' => [
                    'email or password' => ['is invalid'],
                ],
            ], 422);
        }
    }

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
