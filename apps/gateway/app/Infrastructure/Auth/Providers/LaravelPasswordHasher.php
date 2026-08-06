<?php

namespace App\Infrastructure\Auth\Providers;

use App\Domain\Auth\Contracts\PasswordHasherInterface;
use Illuminate\Support\Facades\Hash;

class LaravelPasswordHasher implements PasswordHasherInterface
{
    public function verify(string $plainPassword, string $hashedPassword): bool
    {
        return Hash::check($plainPassword, $hashedPassword);
    }
}
