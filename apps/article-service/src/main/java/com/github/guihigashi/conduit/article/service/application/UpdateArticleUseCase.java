package com.github.guihigashi.conduit.article.service.application;


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
    private final ArticleRepository articleRepository;

    public UpdateArticleUseCase(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    public Article execute(String slug, String title, String description, String body, List<String> tagList, UUID authorId) {
        Article article = articleRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("article not found: slug=" + slug));

        if (!Objects.equals(article.authorId(), authorId)) {
            throw new SecurityException("User is not the author of the article");
        }

        OffsetDateTime now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);

        Article updatedArticle = article.withUpdates(title, description, body, tagList, now);

        articleRepository.save(updatedArticle);

        return updatedArticle;
    }
}
