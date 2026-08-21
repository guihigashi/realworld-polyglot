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

    public Article withUpdates(
            String newTitle,
            String newDescription,
            String newBody,
            List<String> tagList,
            OffsetDateTime updatedAt
    ) {
        String updatedTitle = newTitle != null ? newTitle : this.title;
        String updatedSlug = newTitle != null ? generateSlug(newTitle) : this.slug;
        String updatedDescription = newDescription != null ? newDescription : this.description;
        String updatedBody = newBody != null ? newBody : this.body;

        List<String> updatedTagList = tagList != null ? List.copyOf(tagList) : this.tagList;

        return new Article(
                this.id,
                updatedSlug,
                updatedTitle,
                updatedDescription,
                updatedBody,
                updatedTagList,
                this.createdAt,
                updatedAt,
                this.favorited,
                this.favoritesCount,
                this.authorId
        );
    }

    public static String generateSlug(String title) {
        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("-$", "");
    }

}
