package com.github.guihigashi.conduit.article.service.domain;

import java.util.List;

public record PaginatedArticles(
        List<Article> articles,
        int articlesCount
) {
}
