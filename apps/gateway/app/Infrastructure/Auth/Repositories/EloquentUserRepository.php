<?php

namespace App\Infrastructure\Auth\Repositories;

use App\Domain\Auth\Contracts\UserRepositoryInterface;
use App\Domain\Auth\Entities\User;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Infrastructure\Auth\Persistence\Models\EloquentUser;

class EloquentUserRepository implements UserRepositoryInterface
{
    public function __construct(
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function findById(string $id): ?User
    {
        $eloquentModel = EloquentUser::find($id);

        if (! $eloquentModel) {
            return null;
        }

        return $this->toDomain($eloquentModel);
    }

    public function findByEmail(string $email): ?User
    {
        $eloquentModel = EloquentUser::where('email', $email)->first();

        if (! $eloquentModel) {
            return null;
        }

        return $this->toDomain($eloquentModel);
    }

    public function save(User $user): void
    {
        EloquentUser::updateOrCreate([
            'id' => $user->getId(),
        ], [
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'password' => $user->getPasswordHash(),
            'bio' => $user->getBio(),
            'image' => $user->getImage(),
        ]);

        $this->socialGraphService->upsertProfileProjection($user);
    }

    private function toDomain(EloquentUser $model): User
    {
        return new User(
            id: $model->id,
            username: $model->username,
            email: $model->email,
            passwordHash: $model->password,
            bio: $model->bio,
            image: $model->image,
        );
    }
}
