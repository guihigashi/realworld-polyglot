package com.github.guihigashi.conduit.article.service.application.exception;

public class CommentNotFoundException extends RuntimeException {
    public CommentNotFoundException(Long id) {
        super("Comment not found for id: " + id);
    }
}
