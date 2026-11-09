package com.github.guihigashi.conduit.social.infrastructure.messaging

import com.github.guihigashi.conduit.social.domain.RequestorId
import com.github.guihigashi.conduit.social.infrastructure.config.RabbitMqConfig
import com.rabbitmq.client.AMQP.BasicProperties
import zio.*
import zio.amqp.Amqp
import zio.amqp.model.{ExchangeName, ExchangeType, RoutingKey}
import zio.json.*

import java.net.URI
import java.time.Instant
import java.util.UUID

trait SocialEventPublisher:
  def publishUserFollowed(followerId: RequestorId, followedId: UUID, version: Long): Task[Unit]
  def publishUserUnfollowed(followerId: RequestorId, followedId: UUID, version: Long): Task[Unit]

object SocialEventPublisher:
  private val RoutingKeyUserFollowed   = "social.user-followed"
  private val RoutingKeyUserUnfollowed = "social.user-unfollowed"

  val live: ZLayer[Any, Throwable, SocialEventPublisher] =
    ZLayer.scoped {
      for
        config <- ZIO.config(RabbitMqConfig.config.nested("rabbitmq"))
        uri = URI.create(s"amqp://${config.user}:${config.password}@${config.host}:${config.port}/${config.vhost}")
        conn    <- Amqp.connect(uri)
        channel <- Amqp.createChannel(conn)
        _       <- channel.exchangeDeclare(
          exchange = ExchangeName(config.exchange),
          `type` = ExchangeType.Topic,
          durable = true
        )
      yield new SocialEventPublisher:
        private val jsonProps = new BasicProperties.Builder().contentType("application/json").deliveryMode(2).build()

        override def publishUserFollowed(followerId: RequestorId, followedId: UUID, version: Long): Task[Unit] =
          publishFollowEvent(RoutingKeyUserFollowed, followerId, followedId, version)

        override def publishUserUnfollowed(followerId: RequestorId, followedId: UUID, version: Long): Task[Unit] =
          publishFollowEvent(RoutingKeyUserUnfollowed, followerId, followedId, version)

        private def publishFollowEvent(
            routingKey: String,
            followerId: RequestorId,
            followedId: UUID,
            version: Long
        ): Task[Unit] =
          val now   = Instant.now()
          val event = FollowEvent(
            eventId = UUID.randomUUID(),
            eventType = routingKey,
            aggregateId = followerId,
            timestamp = now,
            payload = FollowEventPayload(followerId, followedId, version)
          )
          val body = event.toJson
          channel.publish(
            exchange = ExchangeName(config.exchange),
            body = body.getBytes("UTF-8"),
            routingKey = RoutingKey(routingKey),
            props = jsonProps
          ) *> ZIO.logInfo(
            s"published event to rabbitmq: exchange=${config.exchange}, routing_key=$routingKey, body=$body"
          )
    }
