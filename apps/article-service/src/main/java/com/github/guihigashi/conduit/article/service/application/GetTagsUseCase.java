package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GetTagsUseCase {
    private final ArticleRepository repository;

    public GetTagsUseCase(ArticleRepository repository) {
        this.repository = repository;
    }

    public List<String> execute() {
        return repository.findAllTags();
    }
}
