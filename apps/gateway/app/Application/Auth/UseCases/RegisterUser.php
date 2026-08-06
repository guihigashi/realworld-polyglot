<?php

namespace App\Application\Auth\UseCases;

use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;
use App\Domain\Auth\Entities\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RegisterUser
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly JwtGeneratorInterface $jwtGenerator,
    ) {}

    public function execute(string $username, string $email, string $password): array
    {
        $user = new User(
            id: Str::uuid()->toString(),
            username: $username,
            email: $email,
            passwordHash: Hash::make($password)
        );

        $this->userRepository->save($user);

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
