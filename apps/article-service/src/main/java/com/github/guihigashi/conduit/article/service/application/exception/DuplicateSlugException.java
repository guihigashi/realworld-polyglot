package com.github.guihigashi.conduit.article.service.application.exception;

public class DuplicateSlugException extends RuntimeException {
    public DuplicateSlugException(String message) {
        super(message);
    }

    public DuplicateSlugException(String message, Throwable cause) {
        super(message, cause);
    }
}
