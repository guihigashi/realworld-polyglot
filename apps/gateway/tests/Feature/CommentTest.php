<?php

use App\Domain\Feed\Contracts\FeedServiceInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('retrieves comments from feed service with author profile', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('getComments')
        ->once()
        ->with('dragon-slug', null, null)
        ->andReturn([
            [
                'id' => 1,
                'createdAt' => '2026-11-09T00:00:00.000Z',
                'updatedAt' => '2026-11-09T00:00:00.000Z',
                'body' => 'I love dragons!',
                'author' => [
                    'username' => 'astrid',
                    'bio' => 'Viking warrior',
                    'image' => null,
                    'following' => false,
                ],
            ],
        ]);
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->get('/api/articles/dragon-slug/comments');

    $response->assertOk()
        ->assertJson([
            'comments' => [
                [
                    'id' => 1,
                    'body' => 'I love dragons!',
                    'author' => [
                        'username' => 'astrid',
                    ],
                ],
            ],
        ]);
});

it('forwards X-Follows-Version header to feed service on get comments', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('getComments')
        ->once()
        ->with('dragon-slug', null, 88)
        ->andReturn([
            [
                'id' => 1,
                'createdAt' => '2026-11-09T00:00:00.000Z',
                'updatedAt' => '2026-11-09T00:00:00.000Z',
                'body' => 'I love dragons!',
                'author' => [
                    'username' => 'astrid',
                    'bio' => 'Viking warrior',
                    'image' => null,
                    'following' => true,
                ],
            ],
        ]);
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->withHeader('X-Follows-Version', '88')
        ->get('/api/articles/dragon-slug/comments');

    $response->assertOk()
        ->assertJsonPath('comments.0.author.following', true);
});
