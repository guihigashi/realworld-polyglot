<?php

namespace App\Application\Auth\UseCases;

use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\PasswordHasherInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;

class LoginUser
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly PasswordHasherInterface $passwordHasher,
        private readonly JwtGeneratorInterface $jwtGenerator
    ) {}

    public function execute(string $email, string $password): array
    {
        $user = $this->userRepository->findByEmail($email);

        if (! $user || ! $this->passwordHasher->verify($password, $user->getPasswordHash())) {
            throw new \Exception('Invalid email or password');
        }

        $token = $this->jwtGenerator->generateForUser($user);

        return [
            'email' => $user->getEmail(),
            'token' => $token,
            'username' => $user->getUsername(),
            'bio' => $user->getBio(),
            'image' => $user->getImage(),
        ];
    }
}
