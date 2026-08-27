package com.github.guihigashi.conduit.social.infrastructure.repository

import cats.syntax.all.*
import com.github.guihigashi.conduit.social.domain.exceptions.ProfileNotFoundException
import com.github.guihigashi.conduit.social.infrastructure.db.SkunkPool
import skunk.*
import skunk.codec.all.*
import skunk.data.{Arr, Completion}
import skunk.implicits.*
import zio.*

import java.util.UUID

trait ProfileRepository:
  def upsert(userId: UUID, username: String, bio: Option[String], image: Option[String]): Task[Unit]
  def getProfile(username: String): Task[(String, Option[String], Option[String])]
  def getProfilesByIds(ids: List[UUID]): Task[Map[UUID, (String, Option[String], Option[String])]]
  def follow(followerId: UUID, followeeUsername: String): Task[Unit]
  def unfollow(followerId: UUID, followeeUsername: String): Task[Unit]
  def resolveIdsByUsernames(usernames: List[String]): Task[List[(String, Option[UUID])]]
  def getFollowing(userId: UUID): Task[List[UUID]]

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

        override def upsert(userId: UUID, username: String, bio: Option[String], image: Option[String]): Task[Unit] =
          pool
            .use {
              _.execute(upsertCommand)((userId, username, bio, image)).unit
            }
            .debug

        private val selectQuery: Query[String, (String, Option[String], Option[String])] =
          sql"""select username, bio, image
               |from profiles
               |where username = $varchar""".stripMargin.query((varchar, text.opt, varchar.opt).tupled)

        override def getProfile(username: String): Task[(String, Option[String], Option[String])] =
          pool
            .use {
              _.execute(selectQuery)(username).map(_.headOption)
            }
            .someOrFail(new NoSuchElementException(s"Profile not found for username: $username"))
            .debug

        private val selectProfilesByIds: Query[Arr[UUID], (UUID, (String, Option[String], Option[String]))] =
          sql"""select user_id, username, bio, image
               |from profiles
               |where user_id = any($_uuid)"""
            .stripMargin
            .query((uuid, varchar, text.opt, varchar.opt).tupled)
            .map {
              case (id, username, bio, image) => id -> (username, bio, image)
            }

        override def getProfilesByIds(ids: List[UUID])
            : Task[Map[UUID, (String, Option[String], Option[String])]] =
          pool.use(_.execute(selectProfilesByIds)(Arr.fromFoldable(ids))).map(_.toMap)

        private val followCommand: Command[(UUID, String)] =
          sql"""insert into follows (follower_id, followed_id)
               |select $uuid, user_id
               |from profiles
               |where username = $varchar""".stripMargin.command

        override def follow(followerId: UUID, followeeUsername: String): Task[Unit] =
          pool
            .use(_.execute(followCommand)(followerId, followeeUsername))
            .flatMap {
              case Completion.Insert(count) if count > 0 => ZIO.unit
              case _                                     => ZIO.fail(ProfileNotFoundException(followeeUsername))
            }

        private val unfollowCommand: Command[(UUID, String)] =
          sql"""delete
               |from follows
               |where follower_id = $uuid
               |  and followed_id = (select user_id from profiles where username = $varchar)""".stripMargin.command

        override def unfollow(followerId: UUID, followeeUsername: String): Task[Unit] =
          pool
            .use(_.execute(unfollowCommand)(followerId, followeeUsername))
            .flatMap {
              case Completion.Delete(count) if count > 0 => ZIO.unit
              case _                                     => ZIO.fail(ProfileNotFoundException(followeeUsername))
            }

        private val selectIdsByUsernames: Query[Arr[String], (String, UUID)] =
          sql"""select username, user_id
               |from profiles
               |where username = any($_varchar)""".stripMargin.query((varchar, uuid).tupled)

        override def resolveIdsByUsernames(usernames: List[String]): Task[List[(String, Option[UUID])]] =
          if usernames.isEmpty then
            ZIO.succeed(Nil)
          else
            pool
              .use {
                _.execute(selectIdsByUsernames)(Arr.fromFoldable(usernames))
                  .map { rows =>
                    val resultMap = rows.toMap
                    usernames.map { username =>
                      username -> resultMap.get(username)
                    }
                  }
              }
              .debug

        private val selectFollowing: Query[UUID, UUID] =
          sql"""select followed_id
               |from follows
               |where follower_id = $uuid""".stripMargin.query(uuid)

        override def getFollowing(userId: UUID): Task[List[UUID]] =
          pool.use(_.execute(selectFollowing)(userId)).debug

    }
