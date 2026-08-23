<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\AddComment;
use Illuminate\Http\Request;

readonly class CommentController
{
    public function __construct(
        private AddComment $addCommentUseCase,
    ) {}

    public function store(Request $request, string $slug)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $payload = $request->validate([
            'comment.body' => 'required|string',
        ])['comment'];

        $comment = $this->addCommentUseCase->execute($slug, $payload, $requestorId);

        return response()->json([
            'comment' => $comment,
        ], 201);
    }
}
