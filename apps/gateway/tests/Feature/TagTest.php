<?php

use App\Domain\Feed\Contracts\FeedServiceInterface;

it('streams tags from feed service', function () {
    $feedService = Mockery::mock(FeedServiceInterface::class);
    $feedService->shouldReceive('getTags')->once()->andReturn(
        (function () {
            yield 'dragons';
            yield 'training';
        })()
    );
    app()->instance(FeedServiceInterface::class, $feedService);

    $response = $this->get('/api/tags');

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json');

    expect($response->streamedContent())->toBe('{"tags":["dragons","training"]}');
});
