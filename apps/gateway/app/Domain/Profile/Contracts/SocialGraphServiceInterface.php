<?php

namespace App\Domain\Profile\Contracts;

use App\Domain\Profile\Entities\Profile;

interface SocialGraphServiceInterface
{
    public function getProfile(string $requestorId, string $targetUsername): Profile;

    public function followUser(string $followerId, string $targetUsername): Profile;

    public function unfollowUser(string $followerId, string $targetUsername): Profile;
}
