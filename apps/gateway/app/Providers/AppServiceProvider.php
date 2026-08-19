<?php

namespace App\Providers;

use App\Domain\Article\Contracts\ArticleServiceInterface;
use App\Domain\Auth\Contracts\JwtDecoderInterface;
use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\PasswordHasherInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;
use App\Domain\Profile\Contracts\SocialGraphServiceInterface;
use App\Infrastructure\Article\Services\GrpcArticleService;
use App\Infrastructure\Auth\Providers\FirebaseJwtDecoder;
use App\Infrastructure\Auth\Providers\FirebaseJwtGenerator;
use App\Infrastructure\Auth\Providers\LaravelPasswordHasher;
use App\Infrastructure\Auth\Repositories\EloquentUserRepository;
use App\Infrastructure\Profile\Services\GrpcSocialGraphService;
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

        $this->app->bind(SocialGraphServiceInterface::class, GrpcSocialGraphService::class);

        $this->app->bind(ArticleServiceInterface::class, GrpcArticleService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
