<?php

namespace App\Infrastructure\Feed\Services;

use App\Application\Article\Exceptions\ArticleNotFoundException;
use App\Domain\Feed\Contracts\FeedServiceInterface;
use App\Infrastructure\Traits\RequestorMetadata;
use Generated\Grpc\Feed\Article;
use Generated\Grpc\Feed\FeedServiceClient;
use Generated\Grpc\Feed\GetArticleRequest;
use Generated\Grpc\Feed\GetArticleResponse;
use Generated\Grpc\Feed\GetCommentsRequest;
use Generated\Grpc\Feed\GetCommentsResponse;
use Generated\Grpc\Feed\GetFeedRequest;
use Generated\Grpc\Feed\GetFeedResponse;
use Generated\Grpc\Feed\GetTagsResponse;
use Generated\Grpc\Feed\ListArticlesRequest;
use Generated\Grpc\Feed\ListArticlesResponse;
use Generator;
use Google\Protobuf\GPBEmpty;

readonly class GrpcFeedService implements FeedServiceInterface
{
    use RequestorMetadata;

    public function __construct(
        private FeedServiceClient $client
    ) {}

    public function getFeed(int $limit, int $offset, string $requestorId, ?int $minFollowsVersion = null, ?int $minFavoritesVersion = null): array
    {
        $request = (new GetFeedRequest)
            ->setLimit($limit)
            ->setOffset($offset);

        if ($minFollowsVersion !== null) {
            $request->setMinFollowsVersion($minFollowsVersion);
        }
        if ($minFavoritesVersion !== null) {
            $request->setMinFavoritesVersion($minFavoritesVersion);
        }

        /** @var GetFeedResponse $response */
        [$response, $status] = $this->client->getFeed(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return [
            'articles' => (function () use ($response) {
                foreach ($response->getArticles() as $article) {
                    yield $this->mapArticleResponse($article);
                }
            })(),
            'articlesCount' => $response->getArticlesCount(),
        ];
    }

    /**
     * @return Generator<string>
     */
    public function getTags(): Generator
    {
        /** @var GetTagsResponse $response */
        [$response, $status] = $this->client->GetTags(new GPBEmpty)->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        foreach ($response->getTags() as $tag) {
            yield $tag->getTag();
        }
    }

    public function listArticles(?string $tag, ?string $author, ?string $favorited, int $limit, int $offset, ?string $requestorId, ?int $minFavoritesVersion = null): array
    {
        $request = (new ListArticlesRequest)
            ->setLimit($limit)
            ->setOffset($offset);

        if ($tag !== null) {
            $request->setTag($tag);
        }
        if ($author !== null) {
            $request->setAuthor($author);
        }
        if ($favorited !== null) {
            $request->setFavorited($favorited);
        }
        if ($minFavoritesVersion !== null) {
            $request->setMinFavoritesVersion($minFavoritesVersion);
        }

        /** @var ListArticlesResponse $response */
        [$response, $status] = $this->client->ListArticles(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return [
            'articles' => (function () use ($response) {
                foreach ($response->getArticles() as $article) {
                    yield $this->mapArticleResponse($article);
                }
            })(),
            'articlesCount' => $response->getArticlesCount(),
         ];
    }

    public function getArticle(string $slug, ?string $requestorId, ?int $minFavoritesVersion = null, ?int $minFollowsVersion = null): array
    {
        $request = (new GetArticleRequest)
            ->setSlug($slug);

        if ($minFavoritesVersion !== null) {
            $request->setMinFavoritesVersion($minFavoritesVersion);
        }
        if ($minFollowsVersion !== null) {
            $request->setMinFollowsVersion($minFollowsVersion);
        }

        /** @var GetArticleResponse $response */
        [$response, $status] = $this->client->GetArticle(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ArticleNotFoundException('not found');
        }

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return $this->mapArticleResponse($response->getArticle());
    }

    public function getComments(string $slug, ?string $requestorId, ?int $minFollowsVersion = null): array
    {
        $request = (new GetCommentsRequest)->setSlug($slug);
        if ($minFollowsVersion !== null) {
            $request->setMinFollowsVersion($minFollowsVersion);
        }

        /** @var GetCommentsResponse $response */
        [$response, $status] = $this->client->GetComments(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code === \Grpc\STATUS_NOT_FOUND) {
            throw new ArticleNotFoundException('not found');
        }
        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return array_map(function (\Generated\Grpc\Feed\Comment $comment) {
            $authorProto = $comment->getAuthor();
            $author = null;
            if ($authorProto !== null) {
                $author = [
                    'username' => $authorProto->getUsername(),
                    'bio' => $authorProto->getBio(),
                    'image' => $authorProto->getImage(),
                    'following' => $authorProto->getFollowing(),
                ];
            }

            return [
                'id' => $comment->getId(),
                'createdAt' => $comment->getCreatedAt(),
                'updatedAt' => $comment->getUpdatedAt(),
                'body' => $comment->getBody(),
                'author' => $author,
            ];
        }, iterator_to_array($response->getComments()));
    }

    private function mapArticleResponse(Article $article): array
    {
        $articleArray = [
            'slug' => $article->getSlug(),
            'title' => $article->getTitle(),
            'description' => $article->getDescription(),
            'tagList' => iterator_to_array($article->getTagList()),
            'createdAt' => $article->getCreatedAt(),
            'updatedAt' => $article->getUpdatedAt(),
            'favorited' => $article->getFavorited(),
            'favoritesCount' => $article->getFavoritesCount(),
            'body' => $article->getBody(),
        ];

        $authorProto = $article->getAuthor();
        if ($authorProto !== null) {
            $articleArray['author'] = [
                'username' => $authorProto->getUsername(),
                'bio' => $authorProto->getBio(),
                'image' => $authorProto->getImage(),
                'following' => $authorProto->getFollowing(),
            ];
        }

        return $articleArray;
    }
}
