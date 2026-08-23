package com.github.guihigashi.conduit.article.service.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record Comment(
        Long id,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String body,
        UUID authorId
) {
    public Comment {
        if (body == null || body.trim().isEmpty()) {
            throw new IllegalArgumentException("Comment body cannot be empty");
        }
        if (authorId == null) {
            throw new IllegalArgumentException("Comment must have an author");
        }
    }
}
