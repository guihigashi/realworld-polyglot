<?php

namespace App\Application\Profile\UseCases;

use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Domain\Profile\Entities\Profile;

readonly class GetProfile
{
    public function __construct(
        private SocialGraphServiceInterface $socialGraphService
    ) {}

    public function execute(?string $requestorId, string $targetUsername): Profile
    {
        return $this->socialGraphService->getProfile($requestorId, $targetUsername);
    }
}
