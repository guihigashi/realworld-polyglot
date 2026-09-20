<?php

namespace App\Presentation\Http\Middleware;

use Benchmark;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RequestDurationMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        /** @var Response $response */
        [$response,$duration] = Benchmark::value(fn () => $next($request));

        $response->headers->set('x-request-duration', sprintf('%.2fms', $duration));

        return $response;
    }
}
