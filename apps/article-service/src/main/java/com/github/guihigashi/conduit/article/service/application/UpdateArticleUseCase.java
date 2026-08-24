package com.github.guihigashi.conduit.article.service.application;


import com.github.guihigashi.conduit.article.service.application.exception.ArticleNotFoundException;
import com.github.guihigashi.conduit.article.service.application.exception.DuplicateSlugException;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class UpdateArticleUseCase {
    private static final int MAX_ATTEMPTS = 5;

    private final ArticleRepository articleRepository;

    public UpdateArticleUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public Article execute(String slug, String title, String description, String body, List<String> tagList, UUID authorId) {
        Article article = articleRepository.findBySlug(slug, authorId)
                .orElseThrow(() -> new ArticleNotFoundException(slug));

        if (!Objects.equals(article.authorId(), authorId)) {
            throw new SecurityException("User is not the author of the article");
        }

        OffsetDateTime now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);

        Article updatedArticle = article.withUpdates(title, description, body, tagList, now);

        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            try {
                return articleRepository.save(updatedArticle);
            } catch (DuplicateSlugException e) {
                if (attempt == MAX_ATTEMPTS - 1) {
                    throw new IllegalStateException("Failed to generate a unique slug after " + MAX_ATTEMPTS + " attempts");
                }

                updatedArticle = updatedArticle.withNewSlugSuffix();
            }
        }

        throw new IllegalStateException("Unexpected error occurred while updating the article");
    }
}
