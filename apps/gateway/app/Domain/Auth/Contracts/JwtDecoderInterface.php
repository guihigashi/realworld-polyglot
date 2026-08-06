<?php

namespace App\Domain\Auth\Contracts;

interface JwtDecoderInterface
{
    public function decode(string $token): ?object;
}
