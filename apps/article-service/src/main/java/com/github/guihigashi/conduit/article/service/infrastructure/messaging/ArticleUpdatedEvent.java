package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ArticleUpdatedEvent(
        UUID eventId,
        String eventType,
        UUID aggregateId,
        OffsetDateTime timestamp,
        Payload payload
) {
    /**
     * Carries both the previous and the new state of what consumers index (slug, tags),
     * so they can apply the difference without querying article-service.
     */
    public record Payload(
            UUID articleId,
            String slug,
            String previousSlug,
            String title,
            String description,
            String body,
            List<String> tagList,
            List<String> previousTagList,
            UUID authorId,
            OffsetDateTime updatedAt,
            long version
    ) {}
}
