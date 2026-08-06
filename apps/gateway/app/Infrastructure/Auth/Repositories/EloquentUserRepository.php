<?php

namespace App\Infrastructure\Auth\Repositories;

use app\Domain\Auth\Contracts\UserRepositoryInterface;
use app\Domain\Auth\Entities\User;
use app\Infrastructure\Auth\Persistence\Models\EloquentUser;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function findById(string $id): ?User
    {
        $eloquentModel = EloquentUser::find($id);

        if (! $eloquentModel) {
            return null;
        }

        return new User(
            id: $eloquentModel->id,
            username: $eloquentModel->username,
            email: $eloquentModel->email,
            passwordHash: $eloquentModel->password
        );
    }

    public function findByEmail(string $email): ?User
    {
        $eloquentModel = EloquentUser::where('email', $email)->first();

        if (! $eloquentModel) {
            return null;
        }

        return new User(
            id: $eloquentModel->id,
            username: $eloquentModel->username,
            email: $eloquentModel->email,
            passwordHash: $eloquentModel->password,
            bio: $eloquentModel->bio,
            image: $eloquentModel->image,
        );
    }

    public function save(User $user): void
    {
        EloquentUser::updateOrCreate([
            'id' => $user->getId(),
        ], [
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'password' => $user->getPasswordHash(),
        ]);
    }
}
