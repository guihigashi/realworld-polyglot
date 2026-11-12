<?php

namespace App\Infrastructure\Feed\Services;

use App\Domain\Feed\Contracts\FeedServiceInterface;
use App\Infrastructure\Traits\RequestorMetadata;
use Generated\Grpc\Feed\Article;
use Generated\Grpc\Feed\FeedServiceClient;
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
