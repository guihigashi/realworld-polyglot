package com.github.guihigashi.conduit.article.service.presentation.grpc;

import com.github.guihigashi.conduit.article.grpc.Article;

public class ArticleGrpcMapper {
    public static Article mapToGrpc(com.github.guihigashi.conduit.article.service.domain.Article domain) {
        return Article.newBuilder()
                .setSlug(domain.slug())
                .setTitle(domain.title())
                .setDescription(domain.description())
                .setBody(domain.body())
                .addAllTagList(domain.tagList())
                .setCreatedAt(domain.createdAt() != null ? domain.createdAt().toString() : "")
                .setUpdatedAt(domain.updatedAt() != null ? domain.updatedAt().toString() : "")
                .setFavorited(domain.favorited())
                .setFavoritesCount(domain.favoritesCount())
                .setAuthorId(domain.authorId().toString())
                .build();
    }
}
