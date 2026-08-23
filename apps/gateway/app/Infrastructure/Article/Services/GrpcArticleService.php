<?php

namespace App\Infrastructure\Article\Services;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Exceptions\ResourceNotFoundException;
use Generated\Grpc\Article\AddCommentRequest;
use Generated\Grpc\Article\AddCommentResponse;
use Generated\Grpc\Article\Article;
use Generated\Grpc\Article\ArticleResponse;
use Generated\Grpc\Article\ArticleServiceClient;
use Generated\Grpc\Article\ArticleSummary;
use Generated\Grpc\Article\Comment;
use Generated\Grpc\Article\CreateArticleRequest;
use Generated\Grpc\Article\DeleteArticleRequest;
use Generated\Grpc\Article\DeleteCommentRequest;
use Generated\Grpc\Article\GetArticleRequest;
use Generated\Grpc\Article\GetCommentsRequest;
use Generated\Grpc\Article\GetCommentsResponse;
use Generated\Grpc\Article\GetTagsResponse;
use Generated\Grpc\Article\ListArticlesRequest;
use Generated\Grpc\Article\ListArticlesResponse;
use Generated\Grpc\Article\TagList;
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

        /** @var ListArticlesResponse $response */
        [$response, $status] = $this->client->ListArticles($request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return array_map([$this, 'mapArticleSummaryResponse'], iterator_to_array($response->getArticles()));
    }

    public function getArticle(string $slug, ?string $requestorId): array
    {
        $request = (new GetArticleRequest)
            ->setSlug($slug);

        /** @var ArticleResponse $response */
        [$response, $status] = $this->client->GetArticle($request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ResourceNotFoundException('not found');
        }

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function createArticle(array $payload, string $authorId): array
    {
        $request = (new CreateArticleRequest)
            ->setTitle($payload['title'])
            ->setDescription($payload['description'])
            ->setBody($payload['body']);

        if (! empty($payload['tagList'])) {
            $request->setTagList($payload['tagList']);
        }

        /** @var ArticleResponse $response */
        [$response, $status] = $this->client->CreateArticle(
            $request, $this->metadataOfRequestor($authorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function updateArticle(string $slug, array $payload, string $requestorId): array
    {
        $request = (new UpdateArticleRequest)
            ->setSlug($slug);

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
            $tagListPayload = (new TagList)
                ->setTags($payload['tagList']);
            $request->setTagList($tagListPayload);
        }

        /** @var ArticleResponse $response */
        [$response, $status] = $this->client->UpdateArticle(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function delete(string $slug, string $requestorId): void
    {
        $request = (new DeleteArticleRequest)
            ->setSlug($slug);

        [, $status] = $this->client->DeleteArticle($request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }
    }

    public function addComment(string $slug, string $body, string $authorId): array
    {
        $request = (new AddCommentRequest)
            ->setSlug($slug)
            ->setBody($body);

        /** @var AddCommentResponse $response */
        [$response, $status] = $this->client->AddComment($request, $this->metadataOfRequestor($authorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapCommentResponse($response->getComment());
    }

    public function getComments(string $slug, ?string $requestorId): array
    {
        $request = (new GetCommentsRequest)
            ->setSlug($slug);

        /** @var GetCommentsResponse $response */
        [$response, $status] = $this->client->GetComments(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return array_map(function (Comment $comment) {
            return $this->mapCommentResponse($comment);
        }, iterator_to_array($response->getComments()));
    }

    public function deleteComment(string $slug, int $id, string $requestorId): void
    {
        $request = (new DeleteCommentRequest)
            ->setSlug($slug)
            ->setId($id);

        [,$status] = $this->client->DeleteComment(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }
    }

    public function getTags(): array
    {
        /** @var GetTagsResponse $response */
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

    private function mapCommentResponse(Comment $comment): array
    {
        return [
            'id' => $comment->getId(),
            'createdAt' => $comment->getCreatedAt(),
            'updatedAt' => $comment->getUpdatedAt(),
            'body' => $comment->getBody(),
            'authorId' => $comment->getAuthorId(),
        ];
    }

    private function metadataOfRequestor(?string $requestorId): array
    {
        if ($requestorId !== null) {
            return [
                'x-requestor-id' => [$requestorId],
            ];
        }

        return [];
    }
}
