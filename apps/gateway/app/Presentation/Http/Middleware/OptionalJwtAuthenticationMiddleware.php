<?php

namespace App\Presentation\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class OptionalJwtAuthenticationMiddleware extends AbstractJwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        [$payload, $errorMessage] = $this->resolvePayload($request);

        if ($payload !== null) {
            $request->attributes->set('auth_user_id', $payload->sub);
        }

        return $next($request);
    }
}
