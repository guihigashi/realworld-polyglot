package com.github.guihigashi.conduit.article.service.infrastructure.persistence;

import java.util.UUID;

public record TagForArticle(
        UUID articleId,
        String tag
) {
}
