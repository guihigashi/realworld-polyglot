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
        assertThat(event.payload().version()).isEqualTo(1L);
    }

    @Test
    void shouldPublishCommentAddedEvent() {
        RabbitMqArticleEventPublisher publisher = new RabbitMqArticleEventPublisher(rabbitTemplate, "events");
        UUID authorId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        var comment = new com.github.guihigashi.conduit.article.service.domain.Comment(
                42L, now, now, "Great article!", authorId
        );

        publisher.publishCommentAdded(comment, "test-slug");

        ArgumentCaptor<CommentAddedEvent> eventCaptor = ArgumentCaptor.forClass(CommentAddedEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq("events"),
                eq(RabbitMqArticleEventPublisher.ROUTING_KEY_ARTICLE_COMMENT_ADDED),
                eventCaptor.capture()
        );

        CommentAddedEvent event = eventCaptor.getValue();
        assertThat(event.eventType()).isEqualTo("article.comment-added");
        assertThat(event.payload().commentId()).isEqualTo(42L);
        assertThat(event.payload().slug()).isEqualTo("test-slug");
        assertThat(event.payload().body()).isEqualTo("Great article!");
        assertThat(event.payload().authorId()).isEqualTo(authorId);
    }

    @Test
    void shouldPublishCommentDeletedEvent() {
        RabbitMqArticleEventPublisher publisher = new RabbitMqArticleEventPublisher(rabbitTemplate, "events");
        UUID authorId = UUID.randomUUID();

        publisher.publishCommentDeleted(42L, "test-slug", authorId);

        ArgumentCaptor<CommentDeletedEvent> eventCaptor = ArgumentCaptor.forClass(CommentDeletedEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq("events"),
                eq(RabbitMqArticleEventPublisher.ROUTING_KEY_ARTICLE_COMMENT_DELETED),
                eventCaptor.capture()
        );

        CommentDeletedEvent event = eventCaptor.getValue();
        assertThat(event.eventType()).isEqualTo("article.comment-deleted");
        assertThat(event.payload().commentId()).isEqualTo(42L);
        assertThat(event.payload().slug()).isEqualTo("test-slug");
        assertThat(event.payload().authorId()).isEqualTo(authorId);
    }

    @Test
    void shouldPublishArticleFavoritedEventWithVersion() {
        RabbitMqArticleEventPublisher publisher = new RabbitMqArticleEventPublisher(rabbitTemplate, "events");
        UUID articleId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();

        Article article = new Article(
                articleId, "slug", "Title", "Desc", "Body", List.of(), now, now, true, 5, authorId, 1L
        );

        publisher.publishArticleFavorited(article, userId, 7L);

        ArgumentCaptor<ArticleFavoriteEvent> eventCaptor = ArgumentCaptor.forClass(ArticleFavoriteEvent.class);
        verify(rabbitTemplate).convertAndSend(
                eq("events"),
                eq(RabbitMqArticleEventPublisher.ROUTING_KEY_ARTICLE_FAVORITED),
                eventCaptor.capture()
        );

        ArticleFavoriteEvent event = eventCaptor.getValue();
        assertThat(event.eventType()).isEqualTo("article.favorited");
        assertThat(event.payload().articleId()).isEqualTo(articleId);
        assertThat(event.payload().userId()).isEqualTo(userId);
        assertThat(event.payload().favoritesCount()).isEqualTo(5);
        assertThat(event.payload().version()).isEqualTo(7L);
    }
}
