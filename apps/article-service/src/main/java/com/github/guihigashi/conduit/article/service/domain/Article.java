package com.github.guihigashi.conduit.article.service.domain;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record Article(
        UUID id,
        String slug,
        String title,
        String description,
        String body,
        List<String> tagList,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        boolean favorited,
        int favoritesCount,
        UUID authorId
) {
    public Article {
        if (slug == null || slug.isBlank()) throw new IllegalArgumentException("Slug cannot be empty");
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Title cannot be empty");
        if (authorId == null) throw new IllegalArgumentException("AuthorId cannot be empty");
    }
}
