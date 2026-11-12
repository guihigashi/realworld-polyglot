package com.github.guihigashi.conduit.article.service.domain;

public record FavoritedArticleResult(
        Article article,
        long favoritesVersion,
        boolean changed
) {}
