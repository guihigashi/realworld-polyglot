<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\AddComment;
use App\Application\Article\UseCases\GetComments;
use Illuminate\Http\Request;

readonly class CommentController
{
    public function __construct(
        private AddComment $addCommentUseCase,
        private GetComments $getCommentsUseCase,
    ) {}

    public function index(Request $request, string $slug)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $comments = $this->getCommentsUseCase->execute($slug, $requestorId);

        return response()->json([
            'comments' => $comments,
        ]);
    }

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
