package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CommentDeletedEvent(
        UUID eventId,
        String eventType,
        UUID aggregateId,
        OffsetDateTime timestamp,
        Payload payload
) {
    public record Payload(
            Long commentId,
            String slug,
            UUID authorId,
            OffsetDateTime deletedAt
    ) {}
}
