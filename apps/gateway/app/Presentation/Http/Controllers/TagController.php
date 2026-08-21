<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\GetTags;
use Illuminate\Http\JsonResponse;

readonly class TagController
{
    public function __construct(
        private GetTags $getTagsUseCase
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'tags' => $this->getTagsUseCase->execute(),
        ]);
    }
}
