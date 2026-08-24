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
        if (title == null || title.isBlank()) throw new IllegalArgumentException("Title cannot be empty");
        if (authorId == null) throw new IllegalArgumentException("AuthorId cannot be empty");

        if (slug == null || slug.isBlank()) {
            slug = generateSlug(title);
        }
    }

    public Article withUpdates(
            String newTitle,
            String newDescription,
            String newBody,
            List<String> tagList,
            OffsetDateTime updatedAt
    ) {
        String updatedTitle = newTitle != null ? newTitle : this.title;
        String updatedSlug = newTitle != null && !newTitle.equals(this.title) ? null : this.slug;
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

    public Article withNewSlugSuffix() {
        String updatedSlug = generateSlug(title);

        return new Article(
                id,
                updatedSlug,
                title,
                description,
                body,
                tagList,
                createdAt,
                updatedAt,
                favorited,
                favoritesCount,
                authorId
        );
    }

    public static String generateSlug(String title) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\-]", "-")
                .replaceAll("-+", "-")
                .replaceAll("-$", "")
                + "-" + suffix;
    }

}
