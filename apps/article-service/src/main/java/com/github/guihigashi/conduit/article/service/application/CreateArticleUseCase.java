package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class CreateArticleUseCase {
    private final ArticleRepository repository;

    public CreateArticleUseCase(ArticleRepository repository) {
        this.repository = repository;
    }

    public Article execute(String title, String description, String body, List<String> tagList, UUID authorId) {
        var slug = Article.generateSlug(title);
        var now = OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);

        var article = new Article(
                UUID.randomUUID(),
                slug,
                title,
                description,
                body,
                tagList,
                now,
                now,
                false,
                0,
                authorId);

        return repository.save(article);
    }
}
