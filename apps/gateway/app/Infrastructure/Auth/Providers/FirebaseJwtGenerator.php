<?php

namespace App\Infrastructure\Auth\Providers;

use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Entities\User;
use Firebase\JWT\JWT;

class FirebaseJwtGenerator implements JwtGeneratorInterface
{
    public function generateForUser(User $user): string
    {

        $payload = [
            'iss' => 'identity-gateway',
            'sub' => $user->getId(),
            'email' => $user->getEmail(),
            'username' => $user->getUsername(),
            'iat' => time(),
            // Token expires in 30 days (RealWorld spec is usually stateless/long-lived)
            'exp' => time() + (60 * 60 * 24 * 30),
        ];

        // We use Laravel's existing APP_KEY to sign the token
        // You could also use a dedicated env('JWT_SECRET') if you prefer
        $secret = config('app.key');

        return JWT::encode($payload, $secret, 'HS256');
    }
}
