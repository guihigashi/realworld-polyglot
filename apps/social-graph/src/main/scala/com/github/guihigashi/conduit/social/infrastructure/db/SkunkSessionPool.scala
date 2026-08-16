package com.github.guihigashi.conduit.social.infrastructure.db

import cats.effect.std.Console
import com.github.guihigashi.conduit.social.infrastructure.config.DbConfig
import fs2.io.net.Network
import org.typelevel.otel4s.metrics.Meter.Implicits.noop
import org.typelevel.otel4s.trace.Tracer.Implicits.noop
import skunk.Session
import skunk.Session.Credentials
import zio.interop.catz.*
import zio.{Task, ZIO, ZLayer}

trait SkunkPool:
  def use[A](f: Session[Task] => Task[A]): Task[A]

object SkunkSessionPool:

  val live: ZLayer[Any, Throwable, SkunkPool] =
    ZLayer.scoped {
      given cats.effect.std.Console[Task] = cats.effect.std.Console.make[Task]
      given fs2.io.net.Network[Task]      = fs2.io.net.Network.forAsync[Task]

      ZIO
        .config(DbConfig.config.nested("db"))
        .flatMap { config =>
          Session
            .Builder[Task]
            .withHost(config.host)
            .withPort(config.port)
            .withDatabase(config.database)
            .withCredentials(Credentials(config.user, config.password))
            .pooled(config.maxPoolSize)
            .toScopedZIO
            .map { pool =>
              new SkunkPool:
                override def use[A](f: Session[Task] => Task[A]): Task[A] = pool.use(f)
            }
        }
    }
