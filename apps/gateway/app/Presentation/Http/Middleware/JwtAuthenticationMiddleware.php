<?php

namespace App\Presentation\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class JwtAuthenticationMiddleware extends AbstractJwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        [$payload, $errorMessage] = $this->resolvePayload($request);

        if ($payload === null) {
            return response()->json(['errors' => $errorMessage], 401);
        }

        $request->attributes->set('auth_user_id', $payload->sub);

        return $next($request);
    }
}
