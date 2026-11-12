package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Shared shape of article.favorited and article.unfavorited (the event type tells them apart).
 */
public record ArticleFavoriteEvent(
        UUID eventId,
        String eventType,
        UUID aggregateId,
        OffsetDateTime timestamp,
        Payload payload
) {
    public record Payload(
            UUID articleId,
            String slug,
            UUID userId,
            int favoritesCount,
            OffsetDateTime occurredAt,
            long version
    ) {}
}
