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
            if (is_string($secret) && str_starts_with($secret, 'base64:')) {
                $decoded = base64_decode(substr($secret, 7), true);
                if ($decoded !== false) {
                    $secret = $decoded;
                }
            }

            return JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $e) {
            return null;
        }
    }
}
