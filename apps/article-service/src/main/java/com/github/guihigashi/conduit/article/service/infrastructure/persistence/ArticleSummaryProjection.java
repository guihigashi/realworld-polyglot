package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ArticleSummaryProjection(
        UUID id,
        String slug,
        String title,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        UUID authorId
) {
}
