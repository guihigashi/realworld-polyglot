<?php

namespace App\Application\Auth\UseCases;

use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\PasswordHasherInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;

class UpdateUser
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly JwtGeneratorInterface $jwtGenerator,
        private readonly PasswordHasherInterface $passwordHasher
    ) {}

    public function execute(string $userId, array $data): array
    {
        $user = $this->userRepository->findById($userId);

        if (! $user) {
            throw new \Exception('User not found');
        }

        if (array_key_exists('username', $data)) {
            $user->changeUsername($data['username']);
        }

        if (array_key_exists('email', $data)) {
            $user->changeEmail($data['email']);
        }

        if (isset($data['password'])) {
            $hashed = $this->passwordHasher->hash($data['password']);
            $user->changePassword($hashed);
        }

        if (array_key_exists('bio', $data)) {
            $user->changeBio($data['bio']);
        }

        if (array_key_exists('image', $data)) {
            $user->changeImage($data['image']);
        }

        $this->userRepository->save($user);

        return [
            'email' => $user->getEmail(),
            'token' => $this->jwtGenerator->generateForUser($user),
            'username' => $user->getUsername(),
            'bio' => $user->getBio(),
            'image' => $user->getImage(),
        ];
    }
}
