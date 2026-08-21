package com.github.guihigashi.conduit.article.service.presentation.grpc;

import com.github.guihigashi.conduit.article.grpc.Article;
import com.github.guihigashi.conduit.article.grpc.ArticleSummary;

import java.time.format.DateTimeFormatter;

public class ArticleGrpcMapper {
    public static Article toProto(com.github.guihigashi.conduit.article.service.domain.Article domain) {
        return Article.newBuilder()
                .setSlug(domain.slug())
                .setTitle(domain.title())
                .setDescription(domain.description())
                .setBody(domain.body())
                .addAllTagList(domain.tagList().stream().sorted().toList())
                .setCreatedAt(domain.createdAt().format(DateTimeFormatter.ISO_INSTANT))
                .setUpdatedAt(domain.updatedAt() != null ? domain.updatedAt().format(DateTimeFormatter.ISO_INSTANT) : "")
                .setFavorited(domain.favorited())
                .setFavoritesCount(domain.favoritesCount())
                .setAuthorId(domain.authorId().toString())
                .build();
    }

    public static ArticleSummary toSummaryProto(com.github.guihigashi.conduit.article.service.domain.Article domain) {
        return ArticleSummary.newBuilder()
                .setSlug(domain.slug())
                .setTitle(domain.title())
                .setDescription(domain.description())
                .addAllTagList(domain.tagList().stream().sorted().toList())
                .setCreatedAt(domain.createdAt().format(DateTimeFormatter.ISO_INSTANT))
                .setUpdatedAt(domain.updatedAt() != null ? domain.updatedAt().format(DateTimeFormatter.ISO_INSTANT) : "")
                .setFavorited(domain.favorited())
                .setFavoritesCount(domain.favoritesCount())
                .setAuthorId(domain.authorId().toString())
                .build();
    }
}
