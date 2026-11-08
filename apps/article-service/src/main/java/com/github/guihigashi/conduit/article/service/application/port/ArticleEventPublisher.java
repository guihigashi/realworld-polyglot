package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.domain.Article;

import java.util.UUID;

public interface ArticleEventPublisher {
    void publishArticleCreated(Article article);

    void publishArticleUpdated(Article previous, Article updated);

    void publishArticleDeleted(Article article);

    void publishArticleFavorited(Article article, UUID userId);

    void publishArticleUnfavorited(Article article, UUID userId);
}
