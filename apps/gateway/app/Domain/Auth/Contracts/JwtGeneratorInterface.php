<?php

namespace App\Domain\Auth\Contracts;

use App\Domain\Auth\Entities\User;

interface JwtGeneratorInterface
{
    public function generateForUser(User $user): string;
}
