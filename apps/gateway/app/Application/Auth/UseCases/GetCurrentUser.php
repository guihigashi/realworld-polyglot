<?php

namespace App\Application\Auth\UseCases;

use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;

class GetCurrentUser
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly JwtGeneratorInterface $jwtGenerator
    ) {}

    public function execute(string $userId): array
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        return [
            'email' => $user->getEmail(),
            'token' => $this->jwtGenerator->generateForUser($user),
            'username' => $user->getUsername(),
            'bio' => $user->getBio(),
            'image' => $user->getImage(),
        ];
    }
}
