<?php

namespace App\Presentation\Http\Controllers;

class TagController
{
public function __construct(
        private readonly GetTags $getTagsUseCase
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'tags' => $this->getTagsUseCase->execute(),
        ]);
    }
}
