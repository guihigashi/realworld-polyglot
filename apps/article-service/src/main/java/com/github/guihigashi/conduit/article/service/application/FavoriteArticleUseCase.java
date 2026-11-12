package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleEventPublisher;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.FavoritedArticleResult;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class FavoriteArticleUseCase {

    private final ArticleRepository articleRepository;
    private final ArticleEventPublisher eventPublisher;

    public FavoriteArticleUseCase(ArticleRepository articleRepository, ArticleEventPublisher eventPublisher) {
        this.articleRepository = articleRepository;
        this.eventPublisher = eventPublisher;
    }

    public FavoritedArticleResult execute(String slug, UUID requestorId) {
        var result = articleRepository.favoriteArticle(slug, requestorId);
        if (result.changed()) {
            eventPublisher.publishArticleFavorited(result.article(), requestorId, result.favoritesVersion());
        }
        return result;
    }
}
