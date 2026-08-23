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
     * @param \Generated\Grpc\Article\ListArticlesRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function ListArticles(\Generated\Grpc\Article\ListArticlesRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/ListArticles',
        $argument,
        ['\Generated\Grpc\Article\ListArticlesResponse', 'decode'],
        $metadata, $options);
    }

    /**
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

    /**
     * @param \Generated\Grpc\Article\CreateArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function CreateArticle(\Generated\Grpc\Article\CreateArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/CreateArticle',
        $argument,
        ['\Generated\Grpc\Article\ArticleResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Article\UpdateArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function UpdateArticle(\Generated\Grpc\Article\UpdateArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/UpdateArticle',
        $argument,
        ['\Generated\Grpc\Article\ArticleResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Article\DeleteArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function DeleteArticle(\Generated\Grpc\Article\DeleteArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/DeleteArticle',
        $argument,
        ['\Google\Protobuf\GPBEmpty', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Article\AddCommentRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function AddComment(\Generated\Grpc\Article\AddCommentRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/AddComment',
        $argument,
        ['\Generated\Grpc\Article\AddCommentResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Article\FavoriteArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function FavoriteArticle(\Generated\Grpc\Article\FavoriteArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/FavoriteArticle',
        $argument,
        ['\Generated\Grpc\Article\ArticleResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Generated\Grpc\Article\UnfavoriteArticleRequest $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function UnfavoriteArticle(\Generated\Grpc\Article\UnfavoriteArticleRequest $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/UnfavoriteArticle',
        $argument,
        ['\Generated\Grpc\Article\ArticleResponse', 'decode'],
        $metadata, $options);
    }

    /**
     * @param \Google\Protobuf\GPBEmpty $argument input argument
     * @param array $metadata metadata
     * @param array $options call options
     * @return \Grpc\UnaryCall
     */
    public function GetTags(\Google\Protobuf\GPBEmpty $argument,
      $metadata = [], $options = []) {
        return $this->_simpleRequest('/com.github.guihigashi.conduit.article.ArticleService/GetTags',
        $argument,
        ['\Generated\Grpc\Article\GetTagsResponse', 'decode'],
        $metadata, $options);
    }

}
