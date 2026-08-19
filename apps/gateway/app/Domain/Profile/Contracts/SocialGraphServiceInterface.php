<?php

namespace App\Domain\Profile\Contracts;

use App\Domain\Auth\Entities\User;
use App\Domain\Profile\Entities\Profile;

interface SocialGraphServiceInterface
{
    public function upsertProfileProjection(User $user): void;

    public function getProfile(?string $requestorId, string $targetUsername): Profile;

    /**
     * @return array<string, Profile>
     */
    public function getProfilesByIds(array $userIds, ?string $requestorId): array;

    public function followUser(string $followerId, string $targetUsername): Profile;

    public function unfollowUser(string $followerId, string $targetUsername): Profile;

    public function resolveIdsByUsernames(array $usernames): array;
}
