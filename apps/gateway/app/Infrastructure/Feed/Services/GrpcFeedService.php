<?php

namespace App\Infrastructure\Feed\Services;

use App\Domain\Feed\Contracts\FeedServiceInterface;
use App\Infrastructure\Traits\RequestorMetadata;
use Generated\Grpc\Feed\FeedServiceClient;
use Generated\Grpc\Feed\GetFeedRequest;
use Generated\Grpc\Feed\GetFeedResponse;
use Grpc\ChannelCredentials;

class GrpcFeedService implements FeedServiceInterface
{
    use RequestorMetadata;

    private FeedServiceClient $client;

    public function __construct()
    {
        $this->client = new FeedServiceClient('localhost:9091', [
            'credentials' => ChannelCredentials::createInsecure(),
        ]);
    }

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
            'articles' => iterator_to_array($response->getArticles()),
            'articlesCount' => $response->getArticlesCount(),
        ];
    }
}
