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

object ProfileRepository:
  val live =
    ZLayer {
      for
        pool <- ZIO.service[SkunkPool]
      yield new ProfileRepository:
        private val upsertCommand: Command[(UUID, String, Option[String], Option[String])] =
          sql"""
              INSERT INTO profiles (user_id, username, bio, image, updated_at)
              VALUES ($uuid, $varchar, ${varchar.opt}, ${varchar.opt}, CURRENT_TIMESTAMP)
              ON CONFLICT (user_id) DO UPDATE 
              SET 
                  username = EXCLUDED.username,
                  bio = EXCLUDED.bio,
                  image = EXCLUDED.image,
                  updated_at = CURRENT_TIMESTAMP
            """.command

        private val selectQuery: Query[String, (String, Option[String], Option[String])] =
          sql"""
              SELECT username, bio, image 
              FROM profiles 
              WHERE username = $varchar
            """.query((varchar, text.opt, varchar.opt).tupled)

        def upsert(userId: UUID, username: String, bio: Option[String], image: Option[String]): Task[Unit] =
          pool.use(_.execute(upsertCommand)((userId, username, bio, image)).unit)

        def getProfile(username: String): Task[(String, Option[String], Option[String])] =
          pool
            .use {
              _.execute(selectQuery)(username)
                .map(_.headOption)
                .map(_.getOrElse(throw new NoSuchElementException(s"Profile not found for username: $username")))
            }
            .debug
    }
