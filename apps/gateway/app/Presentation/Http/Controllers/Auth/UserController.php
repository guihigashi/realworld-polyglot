<?php

namespace App\Presentation\Http\Controllers\Auth;

use App\Application\Auth\UseCases\GetCurrentUser;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private readonly GetCurrentUser $getCurrentUser
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
}
