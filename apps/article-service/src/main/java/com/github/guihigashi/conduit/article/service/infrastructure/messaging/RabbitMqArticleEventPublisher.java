package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import com.github.guihigashi.conduit.article.service.application.port.ArticleEventPublisher;
import com.github.guihigashi.conduit.article.service.domain.Article;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class RabbitMqArticleEventPublisher implements ArticleEventPublisher {

    public static final String ROUTING_KEY_ARTICLE_CREATED = "article.created";

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

        rabbitTemplate.convertAndSend(exchangeName, ROUTING_KEY_ARTICLE_CREATED, event);
    }
}
