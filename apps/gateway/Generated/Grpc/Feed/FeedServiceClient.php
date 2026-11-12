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
     * @return \Grpc\UnaryCall<\Generated\Grpc\Feed\GetFeedResponse>
     */
    public function GetFeed(\Generated\Grpc\Feed\GetFeedRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.feed.FeedService/GetFeed',
        $argument,
        ['\Generated\Grpc\Feed\GetFeedResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Google\Protobuf\GPBEmpty $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\Generated\Grpc\Feed\GetTagsResponse>
     */
    public function GetTags(\Google\Protobuf\GPBEmpty $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.feed.FeedService/GetTags',
        $argument,
        ['\Generated\Grpc\Feed\GetTagsResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Feed\ListArticlesRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\Generated\Grpc\Feed\ListArticlesResponse>
     */
    public function ListArticles(\Generated\Grpc\Feed\ListArticlesRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.feed.FeedService/ListArticles',
        $argument,
        ['\Generated\Grpc\Feed\ListArticlesResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Feed\GetArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall<\Generated\Grpc\Feed\GetArticleResponse>
     */
    public function GetArticle(\Generated\Grpc\Feed\GetArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.feed.FeedService/GetArticle',
        $argument,
        ['\Generated\Grpc\Feed\GetArticleResponse', 'decode'],
        $metadata, $options);
    }

}
