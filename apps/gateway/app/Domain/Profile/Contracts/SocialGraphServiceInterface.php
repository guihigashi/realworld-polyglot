<?php

namespace App\Domain\Profile\Contracts;

use App\Domain\Auth\Entities\User;
use App\Domain\Profile\Entities\Profile;

interface SocialGraphServiceInterface
{
    public function getProfile(string $targetUsername, ?string $requestorId): Profile;

    public function followUser(string $followerId, string $targetUsername): Profile;

    public function unfollowUser(string $followerId, string $targetUsername): Profile;

    /**
     * @return array<string, Profile>
     */
    public function getProfilesByIds(array $userIds, ?string $requestorId): array;

    public function upsertProfileProjection(User $user): void;

    public function resolveIdsByUsernames(array $usernames): array;
}
