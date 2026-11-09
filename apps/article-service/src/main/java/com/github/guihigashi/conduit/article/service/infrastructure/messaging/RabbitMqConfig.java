package com.github.guihigashi.conduit.article.service.infrastructure.messaging;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class RabbitMqConfig {

    @Value("${app.rabbitmq.exchange:events}")
    private String exchangeName;

    @Bean
    public TopicExchange articleEventsExchange() {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        JsonMapper jsonMapper = JsonMapper.builder().build();
        return new JacksonJsonMessageConverter(jsonMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
