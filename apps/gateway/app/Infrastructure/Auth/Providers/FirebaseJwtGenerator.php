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

        $secret = config('app.key');
        if (is_string($secret) && str_starts_with($secret, 'base64:')) {
            $decoded = base64_decode(substr($secret, 7), true);
            if ($decoded !== false) {
                $secret = $decoded;
            }
        }

        return JWT::encode($payload, $secret, 'HS256');
    }
}
