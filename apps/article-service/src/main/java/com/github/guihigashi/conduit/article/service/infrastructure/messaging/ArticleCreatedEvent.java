package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ArticleCreatedEvent(
        UUID eventId,
        String eventType,
        UUID aggregateId,
        OffsetDateTime timestamp,
        Payload payload
) {
    public record Payload(
            UUID articleId,
            String slug,
            String title,
            String description,
            String body,
            List<String> tagList,
            UUID authorId,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            long version
    ) {}
}
