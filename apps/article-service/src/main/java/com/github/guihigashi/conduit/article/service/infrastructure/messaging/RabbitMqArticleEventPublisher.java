package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import com.github.guihigashi.conduit.article.service.application.port.ArticleEventPublisher;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class RabbitMqArticleEventPublisher implements ArticleEventPublisher {

    public static final String ROUTING_KEY_ARTICLE_CREATED = "article.created";
    public static final String ROUTING_KEY_ARTICLE_UPDATED = "article.updated";
    public static final String ROUTING_KEY_ARTICLE_DELETED = "article.deleted";
    public static final String ROUTING_KEY_ARTICLE_FAVORITED = "article.favorited";
    public static final String ROUTING_KEY_ARTICLE_UNFAVORITED = "article.unfavorited";

    private final RabbitTemplate rabbitTemplate;
    private final String exchangeName;

    public RabbitMqArticleEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.rabbitmq.exchange:events}") String exchangeName
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.exchangeName = exchangeName;
    }

    @Override
    public void publishArticleCreated(Article article) {
        var payload = new ArticleCreatedEvent.Payload(
                article.id(),
                article.slug(),
                article.title(),
                article.description(),
                article.body(),
                article.tagList(),
                article.authorId(),
                article.createdAt(),
                article.updatedAt()
        );

        var event = new ArticleCreatedEvent(
                UUID.randomUUID(),
                ROUTING_KEY_ARTICLE_CREATED,
                article.id(),
                OffsetDateTime.now(),
                payload
        );

        send(ROUTING_KEY_ARTICLE_CREATED, event);
    }

    @Override
    public void publishArticleUpdated(Article previous, Article updated) {
        var payload = new ArticleUpdatedEvent.Payload(
                updated.id(),
                updated.slug(),
                previous.slug(),
                updated.title(),
                updated.description(),
                updated.tagList(),
                previous.tagList(),
                updated.authorId(),
                updated.updatedAt()
        );

        var event = new ArticleUpdatedEvent(
                UUID.randomUUID(),
                ROUTING_KEY_ARTICLE_UPDATED,
                updated.id(),
                OffsetDateTime.now(),
                payload
        );

        send(ROUTING_KEY_ARTICLE_UPDATED, event);
    }

    @Override
    public void publishArticleDeleted(Article article) {
        var now = OffsetDateTime.now();
        var payload = new ArticleDeletedEvent.Payload(
                article.id(),
                article.slug(),
                article.tagList(),
                article.authorId(),
                now
        );

        var event = new ArticleDeletedEvent(
                UUID.randomUUID(),
                ROUTING_KEY_ARTICLE_DELETED,
                article.id(),
                now,
                payload
        );

        send(ROUTING_KEY_ARTICLE_DELETED, event);
    }

    @Override
    public void publishArticleFavorited(Article article, UUID userId) {
        sendFavoriteEvent(ROUTING_KEY_ARTICLE_FAVORITED, article, userId);
    }

    @Override
    public void publishArticleUnfavorited(Article article, UUID userId) {
        sendFavoriteEvent(ROUTING_KEY_ARTICLE_UNFAVORITED, article, userId);
    }

    private void sendFavoriteEvent(String routingKey, Article article, UUID userId) {
        var now = OffsetDateTime.now();
        var payload = new ArticleFavoriteEvent.Payload(
                article.id(),
                article.slug(),
                userId,
                article.favoritesCount(),
                now
        );

        var event = new ArticleFavoriteEvent(
                UUID.randomUUID(),
                routingKey,
                article.id(),
                now,
                payload
        );

        send(routingKey, event);
    }

    /**
     * Publishes right away, or after the surrounding transaction commits, so consumers never
     * react to (and reload) data that is not visible yet. Rolled back transactions publish nothing.
     */
    private void send(String routingKey, Object event) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    rabbitTemplate.convertAndSend(exchangeName, routingKey, event);
                }
            });
            return;
        }
        rabbitTemplate.convertAndSend(exchangeName, routingKey, event);
    }
}
