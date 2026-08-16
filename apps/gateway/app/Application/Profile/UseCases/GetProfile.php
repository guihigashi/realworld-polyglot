<?php

namespace App\Application\Profile\UseCases;

use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Domain\Profile\Entities\Profile;

class GetProfile
{
    public function __construct(
        private readonly SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(?string $requestorId, string $targetUsername): Profile
    {
        return $this->socialGraphService->getProfile($requestorId, $targetUsername);
    }
}
