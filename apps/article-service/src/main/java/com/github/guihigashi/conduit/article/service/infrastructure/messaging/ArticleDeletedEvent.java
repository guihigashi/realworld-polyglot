package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ArticleDeletedEvent(
        UUID eventId,
        String eventType,
        UUID aggregateId,
        OffsetDateTime timestamp,
        Payload payload
) {
    public record Payload(
            UUID articleId,
            String slug,
            List<String> tagList,
            UUID authorId,
            OffsetDateTime deletedAt
    ) {}
}
