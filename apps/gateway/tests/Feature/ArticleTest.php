<?php

use App\Domain\Feed\Contracts\FeedServiceInterface;

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
