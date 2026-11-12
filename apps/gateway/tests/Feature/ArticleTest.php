<?php

use App\Domain\Feed\Contracts\FeedServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('streams articles from feed service', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('listArticles')->once()->andReturn([
        'articles' => (function () {
            yield [
                'slug' => 'how-to-train-your-dragon',
                'title' => 'How to train your dragon',
                'description' => 'Ever wonder how?',
                'tagList' => ['dragons', 'training'],
                'createdAt' => '2026-11-09T00:00:00.000Z',
                'updatedAt' => '2026-11-09T00:00:00.000Z',
                'favorited' => false,
                'favoritesCount' => 0,
            ];
        })(),
        'articlesCount' => 1,
    ]);
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->get('/api/articles');

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json');

    $decoded = json_decode($response->streamedContent(), true);
    expect($decoded)->toHaveKeys(['articles', 'articlesCount'])
        ->and($decoded['articlesCount'])->toBe(1)
        ->and($decoded['articles'][0]['slug'])->toBe('how-to-train-your-dragon');
});

it('forwards X-Favorites-Version header to feed service', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('listArticles')
        ->once()
        ->with(null, null, null, 20, 0, null, 42)
        ->andReturn([
            'articles' => (function () {
                yield [
                    'slug' => 'how-to-train-your-dragon',
                    'title' => 'How to train your dragon',
                    'description' => 'Ever wonder how?',
                    'tagList' => ['dragons', 'training'],
                    'createdAt' => '2026-11-09T00:00:00.000Z',
                    'updatedAt' => '2026-11-09T00:00:00.000Z',
                    'favorited' => false,
                    'favoritesCount' => 0,
                ];
            })(),
            'articlesCount' => 1,
        ]);
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->withHeader('X-Favorites-Version', '42')->get('/api/articles');

    $response->assertOk();
});

it('returns X-Favorites-Version header on favorite article', function () {
    $articleService = Mockery::mock(\App\Domain\Article\Contracts\ArticleServiceInterface::class);
    $articleService->shouldReceive('favoriteArticle')
        ->once()
        ->with('test-slug', Mockery::any())
        ->andReturn([
            'article' => [
                'slug' => 'test-slug',
                'title' => 'Test',
                'description' => 'Test desc',
                'body' => 'Test body',
                'tagList' => [],
                'createdAt' => '2026-11-09T00:00:00.000Z',
                'updatedAt' => '2026-11-09T00:00:00.000Z',
                'favorited' => true,
                'favoritesCount' => 1,
                'authorId' => '11111111-1111-1111-1111-111111111111',
            ],
            'favoritesVersion' => 7,
        ]);
    app()->instance(\App\Domain\Article\Contracts\ArticleServiceInterface::class, $articleService);

    $social = Mockery::mock(\App\Domain\Profile\Contracts\SocialGraphServiceInterface::class);
    $social->shouldReceive('getProfilesByIds')
        ->once()
        ->andReturn([
            '11111111-1111-1111-1111-111111111111' => [
                'username' => 'author',
                'bio' => null,
                'image' => null,
                'following' => false,
            ],
        ]);
    $social->shouldReceive('upsertProfileProjection')->byDefault();
    app()->instance(\App\Domain\Profile\Contracts\SocialGraphServiceInterface::class, $social);

    // Register a user to obtain a token
    $registerRes = $this->postJson('/api/users', [
        'user' => [
            'username' => 'favuser',
            'email' => 'fav@example.com',
            'password' => 'password123',
        ],
    ]);
    $token = $registerRes->json('user.token');

    $response = $this->withHeader('Authorization', 'Token '.$token)
        ->postJson('/api/articles/test-slug/favorite');

    $response->assertOk()
        ->assertHeader('X-Favorites-Version', '7');
    expect($response->json('article.favorited'))->toBeTrue();
});

it('retrieves single article from feed service with author profile and body', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('getArticle')
        ->once()
        ->with('dragon-slug', null, null, null)
        ->andReturn([
            'slug' => 'dragon-slug',
            'title' => 'Dragon Title',
            'description' => 'Dragon Desc',
            'body' => 'Dragon Body Content',
            'tagList' => ['dragons'],
            'createdAt' => '2026-11-09T00:00:00.000Z',
            'updatedAt' => '2026-11-09T00:00:00.000Z',
            'favorited' => false,
            'favoritesCount' => 0,
            'author' => [
                'username' => 'hiccup',
                'bio' => 'Dragon trainer',
                'image' => null,
                'following' => false,
            ],
        ]);
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->get('/api/articles/dragon-slug');

    $response->assertOk()
        ->assertJson([
            'article' => [
                'slug' => 'dragon-slug',
                'title' => 'Dragon Title',
                'body' => 'Dragon Body Content',
                'author' => [
                    'username' => 'hiccup',
                ],
            ],
        ]);
});

it('forwards X-Favorites-Version and X-Follows-Version headers to feed service on get article', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('getArticle')
        ->once()
        ->with('dragon-slug', null, 42, 15)
        ->andReturn([
            'slug' => 'dragon-slug',
            'title' => 'Dragon Title',
            'description' => 'Dragon Desc',
            'body' => 'Dragon Body Content',
            'tagList' => ['dragons'],
            'createdAt' => '2026-11-09T00:00:00.000Z',
            'updatedAt' => '2026-11-09T00:00:00.000Z',
            'favorited' => true,
            'favoritesCount' => 1,
            'author' => [
                'username' => 'hiccup',
                'bio' => null,
                'image' => null,
                'following' => true,
            ],
        ]);
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->withHeader('X-Favorites-Version', '42')
        ->withHeader('X-Follows-Version', '15')
        ->get('/api/articles/dragon-slug');

    $response->assertOk()
        ->assertJsonPath('article.favorited', true)
        ->assertJsonPath('article.author.following', true);
});

