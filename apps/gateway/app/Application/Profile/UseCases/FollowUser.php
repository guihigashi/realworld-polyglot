<?php

namespace App\Application\Profile\UseCases;

use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Domain\Profile\Entities\Profile;

class FollowUser {
    public function __construct(
        private readonly SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(string $followerId, string $targetUsername): Profile
    {
        return $this->socialGraphService->followUser($followerId, $targetUsername);
    }
}
