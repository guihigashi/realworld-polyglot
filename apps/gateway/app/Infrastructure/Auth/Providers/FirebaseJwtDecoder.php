<?php

namespace App\Infrastructure\Auth\Providers;

use App\Domain\Auth\Contracts\JwtDecoderInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class FirebaseJwtDecoder implements JwtDecoderInterface
{
    public function decode(string $token): ?object
    {
        try {
            $secret = config('app.key');

            return JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $e) {
            return null;
        }
    }
}
