<?php

namespace App\Providers;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Auth\Contracts\JwtDecoderInterface;
use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\PasswordHasherInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;
use App\Domain\Feed\Contracts\FeedServiceInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Infrastructure\Article\Services\GrpcArticleService;
use App\Infrastructure\Auth\Providers\FirebaseJwtDecoder;
use App\Infrastructure\Auth\Providers\FirebaseJwtGenerator;
use App\Infrastructure\Auth\Providers\LaravelPasswordHasher;
use App\Infrastructure\Auth\Repositories\EloquentUserRepository;
use App\Infrastructure\Feed\Services\GrpcFeedService;
use App\Infrastructure\Profile\Services\GrpcSocialGraphService;
use Generated\Grpc\Article\ArticleServiceClient;
use Generated\Grpc\Feed\FeedServiceClient;
use Generated\Grpc\SocialGraph\SocialGraphServiceClient;
use Grpc\ChannelCredentials;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(UserRepositoryInterface::class, EloquentUserRepository::class);
        $this->app->singleton(JwtGeneratorInterface::class, FirebaseJwtGenerator::class);
        $this->app->singleton(PasswordHasherInterface::class, LaravelPasswordHasher::class);
        $this->app->singleton(JwtDecoderInterface::class, FirebaseJwtDecoder::class);

        $this->app->singleton(ArticleServiceClient::class, function () {
            return new ArticleServiceClient(
                config('grpc.article-service.target'),
                $this->grpcChannelOptions()
            );
        });
        $this->app->singleton(FeedServiceClient::class, function () {
            return new FeedServiceClient(
                config('grpc.feed-aggregator.target'),
                $this->grpcChannelOptions()
            );
        });
        $this->app->singleton(SocialGraphServiceClient::class, function () {
            return new SocialGraphServiceClient(
                config('grpc.social-graph.target'),
                $this->grpcChannelOptions()
            );
        });

        $this->app->bind(SocialGraphServiceInterface::class, GrpcSocialGraphService::class);
        $this->app->bind(ArticleServiceInterface::class, GrpcArticleService::class);
        $this->app->bind(FeedServiceInterface::class, GrpcFeedService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }

    private function grpcChannelOptions(): array
    {
        return [
            'credentials' => ChannelCredentials::createInsecure(),
            'grpc.use_persistent_id' => 1,
            'grpc.persistent_pool' => 1,
            'grpc.keepalive_time_ms' => 20000,
            'grpc.keepalive_timeout_ms' => 5000,
            'grpc.default_service_config' => json_encode([
                'methodConfig' => [
                    [
                        'name' => [(object) []],
                        'waitForReady' => true,
                        'timeout' => '2.0s',
                    ],
                ],
            ]),
            'grpc.initial_reconnect_backoff_ms' => 100,
            'grpc.min_reconnect_backoff_ms' => 100,
            'grpc.max_reconnect_backoff_ms' => 1000,
        ];
    }
}
