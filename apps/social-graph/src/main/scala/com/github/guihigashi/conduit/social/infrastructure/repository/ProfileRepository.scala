package com.github.guihigashi.conduit.social.infrastructure.repository

import cats.syntax.all.*
import com.github.guihigashi.conduit.social.infrastructure.db.SkunkPool
import skunk.*
import skunk.codec.all.*
import skunk.implicits.*
import zio.*

import java.util.UUID

trait ProfileRepository:
  def upsert(userId: UUID, username: String, bio: Option[String], image: Option[String]): Task[Unit]
  def getProfile(username: String): Task[(String, Option[String], Option[String])]
  def follow(followerId: UUID, followeeUsername: String): Task[Unit]
  def unfollow(followerId: UUID, followeeUsername: String): Task[Unit]

object ProfileRepository:
  val live =
    ZLayer {
      for
        pool <- ZIO.service[SkunkPool]
      yield new ProfileRepository:
        private val upsertCommand: Command[(UUID, String, Option[String], Option[String])] =
          sql"""insert into profiles (user_id, username, bio, image, updated_at)
               |values ($uuid, $varchar, ${varchar.opt}, ${varchar.opt}, current_timestamp)
               |on conflict (user_id) do update
               |    set username   = EXCLUDED.username,
               |        bio        = EXCLUDED.bio,
               |        image      = EXCLUDED.image,
               |        updated_at = current_timestamp""".stripMargin.command

        def upsert(userId: UUID, username: String, bio: Option[String], image: Option[String]): Task[Unit] =
          pool
            .use {
              _.execute(upsertCommand)((userId, username, bio, image)).unit
            }
            .debug

        private val selectQuery: Query[String, (String, Option[String], Option[String])] =
          sql"""select username, bio, image
               |from profiles
               |where username = $varchar""".stripMargin.query((varchar, text.opt, varchar.opt).tupled)

        def getProfile(username: String): Task[(String, Option[String], Option[String])] =
          pool
            .use {
              _.execute(selectQuery)(username)
                .map(_.headOption)
                .map(_.getOrElse(throw new NoSuchElementException(s"Profile not found for username: $username")))
            }
            .debug

        private val followCommand: Command[(UUID, String)] =
          sql"""insert into follows (follower_id, followed_id)
               |
               |select $uuid, user_id
               |from profiles
               |where username = $varchar
               |on conflict (follower_id, followed_id) do nothing""".stripMargin.command

        override def follow(followerId: UUID, followeeUsername: String): Task[Unit] =
          pool
            .use {
              _.execute(followCommand)(followerId, followeeUsername).unit
            }
            .debug

        private val unfollowCommand: Command[(UUID, String)] =
          sql"""delete
               |from follows
               |where follower_id = $uuid
               |  and followed_id = (select user_id from profiles where username = $varchar)""".stripMargin.command

        override def unfollow(followerId: UUID, followeeUsername: String): Task[Unit] =
          pool
            .use {
              _.execute(unfollowCommand)(followerId, followeeUsername).unit
            }
            .debug

    }
