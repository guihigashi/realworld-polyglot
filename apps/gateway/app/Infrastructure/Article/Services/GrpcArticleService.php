<?php

namespace App\Infrastructure\Article\Services;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Exceptions\ResourceNotFoundException;
use Generated\Grpc\Article\Article;
use Generated\Grpc\Article\ArticleResponse;
use Generated\Grpc\Article\ArticleServiceClient;
use Generated\Grpc\Article\ArticleSummary;
use Generated\Grpc\Article\CreateArticleRequest;
use Generated\Grpc\Article\GetArticleRequest;
use Generated\Grpc\Article\ListArticlesRequest;
use Generated\Grpc\Article\ListArticlesResponse;
use Generated\Grpc\Article\TagListResponse;
use Generated\Grpc\Article\TagListUpdatePayload;
use Generated\Grpc\Article\UpdateArticleRequest;
use Google\Protobuf\GPBEmpty;
use Grpc\ChannelCredentials;

class GrpcArticleService implements ArticleServiceInterface
{
    private ArticleServiceClient $client;

    public function __construct()
    {
        $this->client = new ArticleServiceClient('localhost:9092', [
            'credentials' => ChannelCredentials::createInsecure(),
        ]);
    }

    public function getArticle(string $slug, ?string $requestorId): array
    {
        $request = new GetArticleRequest;
        $request->setSlug($slug);

        if ($requestorId !== null) {
            $request->setRequestorId($requestorId);
        }

        /** @var ArticleResponse $response */
        [$response, $status] = $this->client->GetArticle($request)->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ResourceNotFoundException('not found');
        }

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function listArticles(?string $tag, ?string $authorId, ?string $favoritedById, int $limit, int $offset, ?string $requestorId): array
    {
        $request = (new ListArticlesRequest)
            ->setLimit($limit)
            ->setOffset($offset);

        if ($tag !== null) {
            $request->setTag($tag);
        }
        if ($authorId !== null) {
            $request->setAuthorId($authorId);
        }
        if ($favoritedById !== null) {
            $request->setFavoritedById($favoritedById);
        }
        if ($requestorId !== null) {
            $request->setRequestorId($requestorId);
        }

        /** @var ListArticlesResponse $response */
        [$response, $status] = $this->client->ListArticles($request)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return array_map([$this, 'mapArticleSummaryResponse'], iterator_to_array($response->getArticles()));
    }

    public function createArticle(array $payload, string $authorId): array
    {
        $request = new CreateArticleRequest;
        $request->setTitle($payload['title']);
        $request->setDescription($payload['description']);
        $request->setBody($payload['body']);
        $request->setAuthorId($authorId);

        if (! empty($payload['tagList'])) {
            $request->setTagList($payload['tagList']);
        }

        /** @var ArticleResponse $response */
        [$response, $status] = $this->client->CreateArticle($request)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function updateArticle(string $slug, array $payload, string $authorId): array
    {
        $request = (new UpdateArticleRequest)
            ->setSlug($slug)
            ->setAuthorId($authorId);

        if (! empty($payload['title'])) {
            $request->setTitle($payload['title']);
        }

        if (! empty($payload['description'])) {
            $request->setDescription($payload['description']);
        }

        if (! empty($payload['body'])) {
            $request->setBody($payload['body']);
        }

        if (isset($payload['tagList'])) {
            $tagListPayload = (new TagListUpdatePayload)
                ->setTags($payload['tagList']);
            $request->setTagList($tagListPayload);
        }

        /** @var ArticleResponse $response */
        [$response, $status] = $this->client->UpdateArticle($request)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function delete(string $slug, string $requestorId): void
    {
        $request = (new GetArticleRequest)
            ->setSlug($slug)
            ->setRequestorId($requestorId);

        [, $status] = $this->client->DeleteArticle($request)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }
    }

    public function getTags(): array
    {
        /** @var TagListResponse $response */
        [$response, $status] = $this->client->GetTags(new GPBEmpty)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return iterator_to_array($response->getTags());
    }

    private function mapArticleResponse(Article $article): array
    {
        return [
            'slug' => $article->getSlug(),
            'title' => $article->getTitle(),
            'description' => $article->getDescription(),
            'body' => $article->getBody(),
            'tagList' => iterator_to_array($article->getTagList()),
            'createdAt' => $article->getCreatedAt(),
            'updatedAt' => $article->getUpdatedAt(),
            'favorited' => $article->getFavorited(),
            'favoritesCount' => $article->getFavoritesCount(),
            'authorId' => $article->getAuthorId(),
        ];
    }

    private function mapArticleSummaryResponse(ArticleSummary $article): array
    {
        return [
            'slug' => $article->getSlug(),
            'title' => $article->getTitle(),
            'description' => $article->getDescription(),
            'tagList' => iterator_to_array($article->getTagList()),
            'createdAt' => $article->getCreatedAt(),
            'updatedAt' => $article->getUpdatedAt(),
            'favorited' => $article->getFavorited(),
            'favoritesCount' => $article->getFavoritesCount(),
            'authorId' => $article->getAuthorId(),
        ];
    }
}
