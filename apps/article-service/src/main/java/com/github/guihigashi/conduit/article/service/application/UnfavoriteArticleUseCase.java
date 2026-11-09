package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleEventPublisher;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UnfavoriteArticleUseCase {

    private final ArticleRepository articleRepository;
    private final ArticleEventPublisher eventPublisher;

    public UnfavoriteArticleUseCase(ArticleRepository articleRepository, ArticleEventPublisher eventPublisher) {
        this.articleRepository = articleRepository;
        this.eventPublisher = eventPublisher;
    }

    public Article execute(String slug, UUID requestorId) {
        var article = articleRepository.unfavoriteArticle(slug, requestorId);
        eventPublisher.publishArticleUnfavorited(article, requestorId);
        return article;
    }
}
