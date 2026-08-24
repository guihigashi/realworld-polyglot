package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.domain.Article;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArticleRepository {
    Article save(Article article);

    Optional<Article> findBySlug(String slug, UUID requestorId);

    List<Article> findAllArticles(
            String tag,
            UUID authorId,
            UUID favoritedById,
            int limit,
            int offset
    );

    void deleteBySlug(String slug);

    List<String> findAllTags();

    Article favoriteArticle(String slug, UUID requestorId);

    Article unfavoriteArticle(String slug, UUID requestorId);
}
