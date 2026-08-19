<?php

namespace App\Domain\Profile\Entities;

class Profile
{
    public function __construct(
        public string $username,
        public ?string $bio,
        public ?string $image,
        public bool $following
    ) {}

    public function toArray(): array
    {
        return [
            'username' => $this->username,
            'bio' => $this->bio,
            'image' => $this->image,
            'following' => $this->following,
        ];
    }
}
