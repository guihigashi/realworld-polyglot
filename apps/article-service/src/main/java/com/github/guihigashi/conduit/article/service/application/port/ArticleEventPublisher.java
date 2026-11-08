package com.github.guihigashi.conduit.article.service.application.port;

import com.github.guihigashi.conduit.article.service.domain.Article;

public interface ArticleEventPublisher {
    void publishArticleCreated(Article article);
}
