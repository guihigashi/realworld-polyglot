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
     * @param \Generated\Grpc\Feed\GetFeedRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetFeed(\Generated\Grpc\Feed\GetFeedRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.feed.FeedService/GetFeed',
        $argument,
        ['\Generated\Grpc\Feed\GetFeedResponse', 'decode'],
        $metadata, $options);
    }

}
