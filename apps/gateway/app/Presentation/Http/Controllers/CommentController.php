<?php

namespace App\Presentation\Http\Controllers;

use App\Application\Article\UseCases\AddComment;
use App\Application\Article\UseCases\DeleteComment;
use App\Application\Article\UseCases\GetComments;
use Illuminate\Http\Request;

readonly class CommentController
{
    public function __construct(
        private AddComment $addCommentUseCase,
        private GetComments $getCommentsUseCase,
        private DeleteComment $deleteCommentUseCase,
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

    public function destroy(Request $request, string $slug, int $id)
    {
        $requestorId = $request->attributes->get('auth_user_id');

        $this->deleteCommentUseCase->execute($slug, $id, $requestorId);

        return response(null, 204);
    }
}
