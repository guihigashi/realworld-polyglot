<?php

namespace App\Infrastructure\Feed\Services;

use App\Domain\Feed\Contracts\FeedServiceInterface;
use App\Infrastructure\Traits\RequestorMetadata;
use Generated\Grpc\Feed\Article;
use Generated\Grpc\Feed\FeedServiceClient;
use Generated\Grpc\Feed\GetFeedRequest;
use Generated\Grpc\Feed\GetFeedResponse;

readonly class GrpcFeedService implements FeedServiceInterface
{
    use RequestorMetadata;

    public function __construct(
        private FeedServiceClient $client
    ) {}

    public function getFeed(int $limit, int $offset, string $requestorId): array
    {
        $request = (new GetFeedRequest)
            ->setLimit($limit)
            ->setOffset($offset);

        /** @var GetFeedResponse $response */
        [$response, $status] = $this->client->getFeed(
            $request, $this->metadataOfRequestor($requestorId))->wait();

        if ($status->code !== \Grpc\STATUS_OK) {
            throw new \RuntimeException('gRPC Error: '.$status->details);
        }

        return [
            'articles' => array_map([$this, 'mapArticleResponse'], iterator_to_array($response->getArticles())),
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
            'authorId' => $article->getAuthor(),

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
