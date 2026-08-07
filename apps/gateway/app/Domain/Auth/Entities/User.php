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

    public function changeUsername(string $username): void
    {
        $this->username = $username;
    }

    public function changeEmail(string $email): void
    {
        $this->email = $email;
    }

    public function changePassword(string $passwordHash): void
    {
        $this->passwordHash = $passwordHash;
    }

    public function changeBio(?string $bio): void
    {
        $this->bio = trim((string) $bio) === '' ? null : $bio;
    }

    public function changeImage(?string $image): void
    {
        $this->image = trim((string) $image) === '' ? null : $image;
    }
}
