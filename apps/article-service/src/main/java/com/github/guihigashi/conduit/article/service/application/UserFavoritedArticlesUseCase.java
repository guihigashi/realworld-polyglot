package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UserFavoritedArticlesUseCase {

    private ArticleRepository articleRepository;

    public UserFavoritedArticlesUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public List<UUID> execute(UUID userId) {
        return articleRepository.findUserFavoritedArticlesIds(userId);
    }

}
