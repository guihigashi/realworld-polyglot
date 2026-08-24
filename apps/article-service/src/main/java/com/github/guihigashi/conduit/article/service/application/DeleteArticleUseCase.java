package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Service
public class DeleteArticleUseCase {

    private final ArticleRepository articleRepository;

    public DeleteArticleUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    @Transactional
    public void execute(String slug, UUID authorId) {
        Article article = articleRepository.findBySlug(slug, authorId)
                .orElseThrow(() -> new IllegalArgumentException("Article not found: slug=" + slug));

        if (!Objects.equals(article.authorId(), authorId)) {
            throw new SecurityException("User is not the author of the article");
        }

        articleRepository.deleteBySlug(slug);
    }

}
