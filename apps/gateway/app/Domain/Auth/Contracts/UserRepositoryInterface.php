<?php

namespace App\Domain\Auth\Contracts;

use App\Domain\Auth\Entities\User;

interface UserRepositoryInterface
{
    public function findById(string $id): ?User;

    public function save(User $user): void;
}
