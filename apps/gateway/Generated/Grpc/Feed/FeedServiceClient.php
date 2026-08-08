<?php
// GENERATED CODE -- DO NOT EDIT!

namespace Generated\Grpc\Feed;

/**
 */
class FeedServiceClient extends \Grpc\BaseStub {

    /**
     * @param string $hostname hostname
     * @param array $opts channel options
     * @param \Grpc\Channel $channel (optional) re-use channel object
     */
    public function __construct($hostname, $opts, $channel = null) {
        parent::__construct($hostname, $opts, $channel);
    }

    /**
     * Get personalized feed for a user
     * @param \Generated\Grpc\Feed\FeedRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetFeed(\Generated\Grpc\Feed\FeedRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.feed.FeedService/GetFeed',
        $argument,
        ['\Generated\Grpc\Feed\FeedResponse', 'decode'],
        $metadata, $options);
    }

}
