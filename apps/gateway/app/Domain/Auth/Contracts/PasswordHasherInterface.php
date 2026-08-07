<?php

namespace App\Domain\Auth\Contracts;

interface PasswordHasherInterface
{
    public function verify(string $plainPassword, string $hashedPassword): bool;

    public function hash(string $plainPassword): string;
}
