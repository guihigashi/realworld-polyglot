package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.exception.ArticleNotFoundException;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class GetArticleUseCase {
    private final ArticleRepository articleRepository;

    public GetArticleUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public Article execute(String slug, UUID requestorId) {
        return articleRepository.findBySlug(slug, requestorId)
                .orElseThrow(() -> new ArticleNotFoundException(slug));
    }
}
