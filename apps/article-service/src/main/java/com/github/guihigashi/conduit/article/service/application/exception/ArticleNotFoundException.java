package com.github.guihigashi.conduit.article.service.application.exception;

public class ArticleNotFoundException extends RuntimeException {
    public ArticleNotFoundException(String slug) {
        super("Article not found for slug: " + slug);
    }
}
