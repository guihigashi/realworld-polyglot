<?php

namespace App\Presentation\Http\Middleware;

use App\Domain\Auth\Contracts\JwtDecoderInterface;
use Illuminate\Http\Request;

abstract class AbstractJwtMiddleware
{
    public function __construct(
        protected readonly JwtDecoderInterface $jwtDecoder
    ) {}

    /**
     * @return array{0: ?object, 1: ?string} Returns an array containing the payload and an error message if applicable.
     */
    protected function resolvePayload(Request $request): array
    {
        $header = $request->header('Authorization');

        if (! $header) {
            return [null, [
                'token' => ['is missing'],
            ]];
        }

        if (! preg_match('/^(Token|Bearer)\s+(.*)$/i', $header, $matches)) {
            return [null, 'Unauthorized format'];
        }

        try {
            $payload = $this->jwtDecoder->decode($matches[2]);

            if (! $payload || ! isset($payload->sub)) {
                return [null, 'Unauthorized or expired token'];
            }

            return [$payload, null];
        } catch (\Throwable) {
            return [null, 'Unauthorized or expired token'];
        }
    }
}
