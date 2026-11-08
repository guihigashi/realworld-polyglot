package com.github.guihigashi.conduit.article.service.application;

import com.github.guihigashi.conduit.article.service.application.port.ArticleEventPublisher;
import com.github.guihigashi.conduit.article.service.application.port.ArticleRepository;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreateArticleUseCaseTest {

    @Mock
    private ArticleRepository repository;

    @Mock
    private ArticleEventPublisher eventPublisher;

    @InjectMocks
    private CreateArticleUseCase useCase;

    @Test
    void shouldSaveArticleAndPublishEvent() {
        UUID authorId = UUID.randomUUID();
        when(repository.save(any(Article.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Article created = useCase.execute(
                "How to Train Your Dragon",
                "Ever wonder how?",
                "It takes a lot of patience.",
                List.of("dragons", "training"),
                authorId
        );

        assertThat(created).isNotNull();
        assertThat(created.title()).isEqualTo("How to Train Your Dragon");
        assertThat(created.authorId()).isEqualTo(authorId);

        verify(repository).save(any(Article.class));
        verify(eventPublisher).publishArticleCreated(created);
    }
}
