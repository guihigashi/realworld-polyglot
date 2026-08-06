<?php

namespace App\Providers;

use App\Domain\Auth\Contracts\JwtGeneratorInterface;
use App\Domain\Auth\Contracts\UserRepositoryInterface;
use App\Infrastructure\Auth\Providers\FirebaseJwtGenerator;
use App\Infrastructure\Auth\Repositories\EloquentUserRepository;
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
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
