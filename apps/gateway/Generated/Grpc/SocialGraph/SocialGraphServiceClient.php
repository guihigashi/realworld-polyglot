<?php
// GENERATED CODE -- DO NOT EDIT!

namespace Generated\Grpc\SocialGraph;

/**
 */
class SocialGraphServiceClient extends \Grpc\BaseStub {

    /**
     * @param string $hostname hostname
     * @param array $opts channel options
     * @param \Grpc\Channel $channel (optional) re-use channel object
     */
    public function __construct($hostname, $opts, $channel = null) {
        parent::__construct($hostname, $opts, $channel);
    }

    /**
     * @param \Generated\Grpc\SocialGraph\GetProfileRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetProfile(\Generated\Grpc\SocialGraph\GetProfileRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/GetProfile',
        $argument,
        ['\Generated\Grpc\SocialGraph\ProfileResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\SocialGraph\FollowRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function FollowUser(\Generated\Grpc\SocialGraph\FollowRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/FollowUser',
        $argument,
        ['\Generated\Grpc\SocialGraph\ProfileResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\SocialGraph\UnfollowRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function UnfollowUser(\Generated\Grpc\SocialGraph\UnfollowRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/UnfollowUser',
        $argument,
        ['\Generated\Grpc\SocialGraph\ProfileResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\SocialGraph\GetProfilesByIdsRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetProfilesByIds(\Generated\Grpc\SocialGraph\GetProfilesByIdsRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/GetProfilesByIds',
        $argument,
        ['\Generated\Grpc\SocialGraph\ProfilesResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\SocialGraph\UpsertProfileRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function UpsertProfileProjection(\Generated\Grpc\SocialGraph\UpsertProfileRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/UpsertProfileProjection',
        $argument,
        ['\Generated\Grpc\SocialGraph\UpsertProfileResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\SocialGraph\ResolveIdsByUsernamesRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function ResolveIdsByUsernames(\Generated\Grpc\SocialGraph\ResolveIdsByUsernamesRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/ResolveIdsByUsernames',
        $argument,
        ['\Generated\Grpc\SocialGraph\ResolveIdsByUsernamesResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Google\Protobuf\GPBEmpty $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetFollowing(\Google\Protobuf\GPBEmpty $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.social.SocialGraphService/GetFollowing',
        $argument,
        ['\Generated\Grpc\SocialGraph\GetFollowingResponse', 'decode'],
        $metadata, $options);
    }

}
