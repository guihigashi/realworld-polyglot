<?php

namespace App\Infrastructure\Profile\Services;

use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Domain\Profile\Entities\Profile;
use Generated\Grpc\SocialGraph\FollowRequest;
use Generated\Grpc\SocialGraph\GetProfileRequest;
use Generated\Grpc\SocialGraph\ProfileResponse;
use Generated\Grpc\SocialGraph\SocialGraphServiceClient;
use Generated\Grpc\SocialGraph\UnfollowRequest;
use Grpc\ChannelCredentials;

class GrpcSocialGraphService implements SocialGraphServiceInterface
{
    private SocialGraphServiceClient $client;

    public function __construct()
    {
        $this->client = new SocialGraphServiceClient('localhost:9090', [
            'credentials' => ChannelCredentials::createInsecure(),
        ]);
    }

    public function getProfile(string $requestorId, string $targetUsername): Profile
    {
        $grpcRequest = new GetProfileRequest;
        $grpcRequest->setTargetUsername($targetUsername);
        $grpcRequest->setRequestorId($requestorId); // Passed directly per the proto

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->getProfile($grpcRequest)->wait();

        return $this->handleResponse($response, $status);
    }

    public function followUser(string $followerId, string $targetUsername): Profile
    {
        $grpcRequest = new FollowRequest;
        $grpcRequest->setTargetUsername($targetUsername);
        $grpcRequest->setFollowerId($followerId);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->followUser($grpcRequest)->wait();

        return $this->handleResponse($response, $status);
    }

    public function unfollowUser(string $followerId, string $targetUsername): Profile
    {
        $grpcRequest = new UnfollowRequest;
        $grpcRequest->setTargetUsername($targetUsername);
        $grpcRequest->setFollowerId($followerId);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->unfollowUser($grpcRequest)->wait();

        return $this->handleResponse($response, $status);
    }

    private function handleResponse($response, $status): Profile
    {
        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("gRPC Error ({$status->code}): {$status->details}");
        }

        return new Profile(
            username: $response->getUsername(),
            bio: $response->getBio(),
            image: $response->getImage(),
            following: $response->getFollowing()
        );
    }
}
