package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.PaginatedArticles;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GetArticlesFeedUseCase {
    private final ArticleRepository articleRepository;

    public GetArticlesFeedUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public PaginatedArticles execute(
            List<UUID> userIds,
            int limit,
            int offset,
            UUID requestorId
    ) {
        return articleRepository.getArticlesFeed(userIds, limit, offset, requestorId);
    }
}
