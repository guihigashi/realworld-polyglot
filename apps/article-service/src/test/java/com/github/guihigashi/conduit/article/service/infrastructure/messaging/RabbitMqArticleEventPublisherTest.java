package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import com.github.guihigashi.conduit.article.service.domain.Article;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class RabbitMqArticleEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Test
    void shouldPublishArticleCreatedEventToExchangeWithRoutingKey() {
        String exchangeName = "events";
        RabbitMqArticleEventPublisher publisher = new RabbitMqArticleEventPublisher(rabbitTemplate, exchangeName);

        UUID articleId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        Article article = new Article(
                articleId,
                "test-title-slug",
                "Test Title",
                "Test description",
                "Test body",
                List.of("tag1", "tag2"),
                now,
                now,
                false,
                0,
                authorId
        );

        publisher.publishArticleCreated(article);

        ArgumentCaptor<ArticleCreatedEvent> eventCaptor = ArgumentCaptor.forClass(ArticleCreatedEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq("events"),
                eq(RabbitMqArticleEventPublisher.ROUTING_KEY_ARTICLE_CREATED),
                eventCaptor.capture()
        );

        ArticleCreatedEvent event = eventCaptor.getValue();
        assertThat(event.eventId()).isNotNull();
        assertThat(event.eventType()).isEqualTo("article.created");
        assertThat(event.aggregateId()).isEqualTo(articleId);
        assertThat(event.timestamp()).isNotNull();
        assertThat(event.payload()).isNotNull();
        assertThat(event.payload().articleId()).isEqualTo(articleId);
        assertThat(event.payload().slug()).isEqualTo("test-title-slug");
        assertThat(event.payload().title()).isEqualTo("Test Title");
        assertThat(event.payload().tagList()).containsExactly("tag1", "tag2");
        assertThat(event.payload().authorId()).isEqualTo(authorId);
    }
}
