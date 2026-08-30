<?php

namespace App\Infrastructure\Profile\Services;

use App\Application\Exceptions\ProfileNotFoundException;
use App\Domain\Auth\Entities\User;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Domain\Profile\Entities\Profile;
use App\Infrastructure\Traits\RequestorMetadata;
use Generated\Grpc\SocialGraph\FollowRequest;
use Generated\Grpc\SocialGraph\GetProfileRequest;
use Generated\Grpc\SocialGraph\GetProfilesByIdsRequest;
use Generated\Grpc\SocialGraph\ProfileResponse;
use Generated\Grpc\SocialGraph\ProfilesResponse;
use Generated\Grpc\SocialGraph\ResolveIdsByUsernamesRequest;
use Generated\Grpc\SocialGraph\ResolveIdsByUsernamesResponse;
use Generated\Grpc\SocialGraph\SocialGraphServiceClient;
use Generated\Grpc\SocialGraph\UnfollowRequest;
use Generated\Grpc\SocialGraph\UpsertProfileRequest;
use Grpc\ChannelCredentials;
use stdClass;

class GrpcSocialGraphService implements SocialGraphServiceInterface
{
    use RequestorMetadata;

    private SocialGraphServiceClient $client;

    public function __construct()
    {
        $this->client = new SocialGraphServiceClient(config('grpc.social-graph.target'), [
            'credentials' => ChannelCredentials::createInsecure(),
        ]);
    }

    public function getProfile(string $targetUsername, ?string $requestorId): Profile
    {
        $grpcRequest = (new GetProfileRequest)
            ->setTargetUsername($targetUsername);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->getProfile(
            $grpcRequest, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ProfileNotFoundException;
        }

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("Failed to get profile: $status->details");
        }

        return $this->handleResponse($response, $status);
    }

    public function followUser(string $followerId, string $targetUsername): Profile
    {
        $grpcRequest = (new FollowRequest)
            ->setTargetUsername($targetUsername);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->followUser(
            $grpcRequest, $this->metadataOfRequestor($followerId))->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ProfileNotFoundException;
        }

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("gRPC Error ({$status->code}): {$status->details}");
        }

        return $this->handleResponse($response, $status);
    }

    public function unfollowUser(string $followerId, string $targetUsername): Profile
    {
        $request = (new UnfollowRequest)
            ->setTargetUsername($targetUsername);

        /** @var ProfileResponse $response */
        [$response, $status] = $this->client->unfollowUser(
            $request, $this->metadataOfRequestor($followerId))->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ProfileNotFoundException;
        }

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("gRPC Error ({$status->code}): {$status->details}");
        }

        return $this->handleResponse($response, $status);
    }

    public function upsertProfileProjection(User $user): void
    {
        $grpcRequest = (new UpsertProfileRequest)
            ->setUsername($user->getUsername())
            ->setBio($user->getBio() ?? '')
            ->setImage($user->getImage() ?? '');

        [, $status] = $this->client->UpsertProfileProjection(
            $grpcRequest, $this->metadataOfRequestor($user->getId()))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("Failed to project profile: $status->details");
        }
    }

    public function getProfilesByIds(array $userIds, ?string $requestorId): array
    {
        $request = (new GetProfilesByIdsRequest)
            ->setUserIds($userIds);

        /** @var ProfilesResponse $response */
        [$response, $status] = $this->client->getProfilesByIds(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("gRPC Error ({$status->code}): {$status->details}");
        }

        $profiles = [];
        foreach ($response->getProfiles() as $id => $profile) {
            $profiles[$id] = new Profile(
                username: $profile->getUsername(),
                bio: $profile->hasBio() ? $profile->getBio() : null,
                image: $profile->hasImage() ? $profile->getImage() : null,
                following: $profile->getFollowing()
            );
        }

        return $profiles;
    }

    public function resolveIdsByUsernames(array $usernames): array
    {
        $request = (new ResolveIdsByUsernamesRequest)
            ->setUsernames($usernames);

        /** @var ResolveIdsByUsernamesResponse $response */
        [$response, $status] = $this->client->resolveIdsByUsernames($request)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException("gRPC Error ({$status->code}): {$status->details}");
        }

        return iterator_to_array($response->getResolvedIds());
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
