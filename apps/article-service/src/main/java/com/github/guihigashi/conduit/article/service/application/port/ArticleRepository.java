package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.application.exception.ArticleNotFoundException;
import com.github.guihigashi.conduit.article.service.application.exception.DuplicateSlugException;
import com.github.guihigashi.conduit.article.service.domain.Article;
import com.github.guihigashi.conduit.article.service.domain.PaginatedArticles;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArticleRepository {
    Article save(Article article) throws DuplicateSlugException;

    boolean existsBySlug(String slug);

    Optional<Article> findBySlug(String slug, UUID requestorId);

    PaginatedArticles listArticles(
            String tag,
            UUID authorId,
            UUID favoritedById,
            int limit,
            int offset,
            UUID requestorId
    );

    void deleteBySlug(String slug);

    List<String> findAllTags();

    Article favoriteArticle(String slug, UUID requestorId) throws ArticleNotFoundException;

    Article unfavoriteArticle(String slug, UUID requestorId) throws ArticleNotFoundException;

    PaginatedArticles getArticlesFeed(List<UUID> userIds, int limit, int offset, UUID requestorId);
}
