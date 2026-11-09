<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\GetTags;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;

readonly class TagController
{
    public function __construct(
        private GetTags $getTagsUseCase
    ) {}

    public function index(): StreamedJsonResponse
    {
        return response()->streamJson([
            'tags' => $this->getTagsUseCase->execute(),
        ]);
    }
}
