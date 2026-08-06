<?php

namespace App\Presentation\Http\Middleware;

use App\Domain\Auth\Contracts\JwtDecoderInterface;
use Closure;
use Illuminate\Http\Request;

class JwtAuthenticationMiddleware
{
    public function __construct(
        private readonly JwtDecoderInterface $jwtDecoder
    ) {}

    public function handle(Request $request, Closure $next)
    {

        $header = $request->header('Authorization');

        if (! $header) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! preg_match('/^(Token|Bearer)\s+(.*)$/i', $header, $matches)) {
            return response()->json(['message' => 'Unauthorized format'], 401);
        }

        $token = $matches[2];
        $payload = $this->jwtDecoder->decode($token);

        if (! $payload || ! isset($payload->sub)) {
            return response()->json(['message' => 'Unauthorized or expired token'], 401);
        }

        // Attach the authenticated user ID directly to the request attributes
        $request->attributes->set('auth_user_id', $payload->sub);

        return $next($request);
    }
}
