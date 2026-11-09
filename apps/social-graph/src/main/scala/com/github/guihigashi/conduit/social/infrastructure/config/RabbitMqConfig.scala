package com.github.guihigashi.conduit.social.infrastructure.config

import zio.Config
import zio.config.magnolia.deriveConfig

case class RabbitMqConfig(
    host: String,
    port: Int,
    user: String,
    password: String,
    vhost: String = "rwa",
    exchange: String = "events"
)

object RabbitMqConfig:
  val config: Config[RabbitMqConfig] = deriveConfig[RabbitMqConfig]
