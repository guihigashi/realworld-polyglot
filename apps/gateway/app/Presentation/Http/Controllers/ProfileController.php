<?php

namespace App\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use Generated\Grpc\SocialGraph\FollowRequest;
use Generated\Grpc\SocialGraph\ProfileResponse;
use Generated\Grpc\SocialGraph\SocialGraphServiceClient;
use Grpc\ChannelCredentials;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function follow(Request $request, string $username): JsonResponse
    {
        // 1. Instantiate the gRPC Client (plaintext for local dev)
        $client = new SocialGraphServiceClient('127.0.0.1:9090', [
            'credentials' => ChannelCredentials::createInsecure(),
        ]);

        // 2. Build the Protobuf Request
        $grpcRequest = new FollowRequest;
        $grpcRequest->setTargetUsername($username);

        // Use the authenticated user's ID, or a fallback for testing
        $followerId = $request->user() ? (string) $request->user()->id : 'dummy-follower-id';
        $grpcRequest->setFollowerId($followerId);

        // 3. Execute the gRPC Call
        /** @var ProfileResponse $response */
        [$response, $status] = $client->followUser($grpcRequest)->wait();

        // 4. Handle gRPC Errors
        if ($status->code !== \Grpc\STATUS_OK) {
            return response()->json([
                'errors' => [
                    'grpc' => ["Error ({$status->code}): {$status->details}"],
                ],
            ], 500);
        }

        // 5. Map to the RealWorld Spec format
        return response()->json([
            'profile' => [
                'username' => $response->getUsername(),
                'bio' => $response->getBio(),
                'image' => $response->getImage(),
                'following' => $response->getFollowing(),
            ],
        ]);
    }
}
