<?php

namespace App\Infrastructure\Profile\Services;

use App\Domain\Auth\Entities\User;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Domain\Profile\Entities\Profile;
use Generated\Grpc\SocialGraph\FollowRequest;
use Generated\Grpc\SocialGraph\GetProfileRequest;
use Generated\Grpc\SocialGraph\ProfileResponse;
use Generated\Grpc\SocialGraph\SocialGraphServiceClient;
use Generated\Grpc\SocialGraph\UnfollowRequest;
use Generated\Grpc\SocialGraph\UpsertProfileRequest;
use Grpc\ChannelCredentials;
use stdClass;

class GrpcSocialGraphService implements SocialGraphServiceInterface
{
    private SocialGraphServiceClient $client;

    public function __construct()
    {
        $this->client = new SocialGraphServiceClient('localhost:9090', [
            'credentials' => ChannelCredentials::createInsecure(),
        ]);
    }

    public function upsertProfileProjection(User $user): void
    {
        $grpcRequest = (new UpsertProfileRequest)
            ->setUserId($user->getId())
            ->setUsername($user->getUsername())
            ->setBio($user->getBio() ?? '')
            ->setImage($user->getImage() ?? '');

        [, $status] = $this->client->UpsertProfileProjection($grpcRequest)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("Failed to project profile: $status->details");
        }
    }

    public function getProfile(?string $requestorId, string $targetUsername): Profile
    {
        $grpcRequest = (new GetProfileRequest)
            ->setTargetUsername($targetUsername);

        if ($requestorId) {
            $grpcRequest->setRequestorId($requestorId);
        }

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->getProfile($grpcRequest)->wait();

        return $this->handleResponse($response, $status);
    }

    public function followUser(string $followerId, string $targetUsername): Profile
    {
        $grpcRequest = (new FollowRequest)
            ->setFollowerId($followerId)
            ->setTargetUsername($targetUsername);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->followUser($grpcRequest)->wait();

        return $this->handleResponse($response, $status);
    }

    public function unfollowUser(string $followerId, string $targetUsername): Profile
    {
        $request = (new UnfollowRequest)
            ->setFollowerId($followerId)
            ->setTargetUsername($targetUsername);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->unfollowUser($request)->wait();

        return $this->handleResponse($response, $status);
    }

    private function handleResponse(ProfileResponse $response, stdClass $status): Profile
    {
        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("gRPC Error ({$status->code}): {$status->details}");
        }

        return new Profile(
            username: $response->getUsername(),
            bio: $response->hasBio() ? $response->getBio() : null,
            image: $response->hasImage() ? $response->getImage() : null,
            following: $response->getFollowing()
        );
    }
}
