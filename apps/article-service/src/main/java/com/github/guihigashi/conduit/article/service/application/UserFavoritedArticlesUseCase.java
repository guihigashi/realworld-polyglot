package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.UserFavoritesResult;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserFavoritedArticlesUseCase {

    private final ArticleRepository articleRepository;

    public UserFavoritedArticlesUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public UserFavoritesResult execute(UUID userId) {
        return articleRepository.findUserFavoritedArticles(userId);
    }

}
