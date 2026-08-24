package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.PaginatedArticles;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ListArticlesUseCase {
    private final ArticleRepository articleRepository;

    public ListArticlesUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public PaginatedArticles execute(
            String tag,
            UUID authorId,
            UUID favoritedById,
            int limit,
            int offset,
            UUID requestorId
    ) {
        return articleRepository.listArticles(tag, authorId, favoritedById, limit, offset, requestorId);
    }
}
