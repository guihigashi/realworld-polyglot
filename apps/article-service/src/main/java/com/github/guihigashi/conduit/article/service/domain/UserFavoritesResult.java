package com.github.guihigashi.conduit.article.service.domain;

import java.util.List;
import java.util.UUID;

public record UserFavoritesResult(
        List<UUID> articleIds,
        long favoritesVersion
) {}
