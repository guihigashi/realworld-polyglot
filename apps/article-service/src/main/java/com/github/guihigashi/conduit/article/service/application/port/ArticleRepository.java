package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.domain.Article;

import java.util.List;
import java.util.Optional;

public interface ArticleRepository {
    Article save(Article article);

    Optional<Article> findBySlug(String slug);

    List<Article> findAllArticles(
            String tag,
            String author,
            String favoritedBy,
            int limit,
            int offset
    );

    void deleteBySlug(String slug);

    List<String> findAllTags();

    Article favoriteArticle(String slug, String requestorId);

    Article unfavoriteArticle(String slug, String requestorId);
}
