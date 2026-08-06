<?php

namespace App\Domain\Auth\Entities;

class User
{
    public function __construct(
        private readonly string $id,
        private string $username,
        private string $email,
        private string $passwordHash,
        private ?string $bio = null,
        private ?string $image = null,
    ) {}

    public function getId(): string
    {
        return $this->id;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getPasswordHash(): string
    {
        return $this->passwordHash;
    }

    public function getBio(): ?string
    {
        return $this->bio;
    }

    public function getImage(): ?string
    {
        return $this->image;
    }

    public function changeEmail(string $newEmail): void
    {
        if (! filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email format.');
        }

        $this->email = $newEmail;
    }
}
