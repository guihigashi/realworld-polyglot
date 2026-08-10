<?php
// GENERATED CODE -- DO NOT EDIT!

namespace Generated\Grpc\Article;

/**
 */
class ArticleServiceClient extends \Grpc\BaseStub {

    /**
     * @param string $hostname hostname
     * @param array $opts channel options
     * @param \Grpc\Channel $channel (optional) re-use channel object
     */
    public function __construct($hostname, $opts, $channel = null) {
        parent::__construct($hostname, $opts, $channel);
    }

    /**
     * Get a single article by slug
     * @param \Generated\Grpc\Article\GetArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetArticle(\Generated\Grpc\Article\GetArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/GetArticle',
        $argument,
        ['\Generated\Grpc\Article\ArticleResponse', 'decode'],
        $metadata, $options);
    }

}
