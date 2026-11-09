package com.github.guihigashi.conduit.social.infrastructure.repository

import cats.syntax.all.*
import com.github.guihigashi.conduit.social.domain.exceptions.ProfileNotFoundException
import com.github.guihigashi.conduit.social.domain.{Profile, RequestorId}
import com.github.guihigashi.conduit.social.infrastructure.db.SkunkPool
import skunk.*
import skunk.codec.all.*
import skunk.data.{Arr, Completion}
import skunk.implicits.*
import zio.*
import zio.interop.catz.*

import java.util.UUID

case class ProfileRepositoryImpl(pool: SkunkPool) extends ProfileRepository:

  private val profileDecoder: Codec[Profile] = (uuid, varchar, text.opt, varchar.opt, int8).tupled.to[Profile]

  private val getProfileQuery: Query[String, Profile] =
    sql"""select user_id, username, bio, image, follows_version
         |from profiles
         |where username = $varchar""".stripMargin.query(profileDecoder)

  override def getProfile(username: String): Task[Profile] =
    pool
      .use {
        _.execute(getProfileQuery)(username).map(_.headOption)
      }
      .someOrFail(new NoSuchElementException(s"Profile not found for username: $username"))

  private val bumpFollowsVersion: Query[RequestorId, Long] =
    sql"""update profiles
         |set follows_version = follows_version + 1
         |where user_id = ${RequestorId.codec}
         |returning follows_version""".stripMargin.query(int8)

  private val followCommand: Command[(RequestorId, String)] =
    sql"""insert into follows (follower_id, followed_id)
         |select ${RequestorId.codec}, user_id
         |from profiles
         |where username = $varchar""".stripMargin.command

  override def follow(followerId: RequestorId, followeeUsername: String): Task[Long] =
    pool.use { session =>
      session
        .transaction
        .use { xa =>
          session
            .execute(followCommand)(followerId, followeeUsername)
            .flatMap {
              case Completion.Insert(count) if count > 0 => session.unique(bumpFollowsVersion)(followerId)
              case _                                     => ZIO.fail(ProfileNotFoundException(followeeUsername))
            }
        }
    }

  private val unfollowCommand: Command[(RequestorId, String)] =
    sql"""delete
         |from follows
         |where follower_id = ${RequestorId.codec}
         |  and followed_id = (select user_id from profiles where username = $varchar)""".stripMargin.command

  override def unfollow(followerId: RequestorId, followeeUsername: String): Task[Long] =
    pool.use { session =>
      session
        .transaction
        .use { xa =>
          session
            .execute(unfollowCommand)(followerId, followeeUsername)
            .flatMap {
              case Completion.Delete(count) if count > 0 => session.unique(bumpFollowsVersion)(followerId)
              case _                                     => ZIO.fail(ProfileNotFoundException(followeeUsername))
            }
        }
    }

  private val upsertCommand: Command[(RequestorId, String, Option[String], Option[String])] =
    sql"""insert into profiles (user_id, username, bio, image, updated_at)
         |values (${RequestorId.codec}, $varchar, ${varchar.opt}, ${varchar.opt}, current_timestamp)
         |on conflict (user_id) do update
         |    set username   = EXCLUDED.username,
         |        bio        = EXCLUDED.bio,
         |        image      = EXCLUDED.image,
         |        updated_at = current_timestamp""".stripMargin.command

  override def upsert(
      userId: RequestorId,
      username: String,
      bio: Option[String],
      image: Option[String]
  ): Task[Unit] =
    pool.use(_.execute(upsertCommand)((userId, username, bio, image)).unit)

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

  private val selectIdsByUsernames: Query[Arr[String], (String, UUID)] =
    sql"""select username, user_id
         |from profiles
         |where username = any($_varchar)""".stripMargin.query((varchar, uuid).tupled)

  override def resolveIdsByUsernames(usernames: List[String]): Task[List[(String, Option[UUID])]] =
    if usernames.isEmpty then
      ZIO.succeed(Nil)
    else
      pool.use {
        _.execute(selectIdsByUsernames)(Arr.fromFoldable(usernames))
          .map { rows =>
            val resultMap = rows.toMap
            usernames.map { username =>
              username -> resultMap.get(username)
            }
          }
      }

  private val selectFollowing: Query[RequestorId, UUID] =
    sql"""select followed_id
         |from follows
         |where follower_id = ${RequestorId.codec}""".stripMargin.query(uuid)

  private val selectFollowsVersion: Query[RequestorId, Long] =
    sql"""select follows_version
         |from profiles
         |where user_id = ${RequestorId.codec}""".stripMargin.query(int8)

  override def getFollowing(id: RequestorId): Task[(List[UUID], Long)] =
    pool.use { session =>
      for
        ids     <- session.execute(selectFollowing)(id)
        version <- session.unique(selectFollowsVersion)(id)
      yield (ids, version)
    }

  private val selectIsRequestorFollowing: Query[(RequestorId, String), Boolean] =
    sql"""select exists(select 1
         |              from follows f
         |                       inner join profiles p on f.followed_id = p.user_id
         |              where f.follower_id = ${RequestorId.codec}
         |                and p.username = $varchar)
         |""".stripMargin.query(bool)

  override def isRequestorFollowing(followerId: RequestorId, followeeUsername: String): Task[Boolean] =
    pool.use(_.execute(selectIsRequestorFollowing)(followerId, followeeUsername).map(_.headOption.getOrElse(false)))

  private val selectIsRequestorFollowingIds: Query[(RequestorId, Arr[UUID]), UUID] =
    sql"""select followed_id
         |from follows
         |where follower_id = ${RequestorId.codec}
         |  and followed_id = any($_uuid)
         |""".stripMargin.query(uuid)

  override def isRequestorFollowingIds(followerId: RequestorId, followeeIds: List[UUID]): Task[Set[UUID]] =
    pool.use(_.execute(selectIsRequestorFollowingIds)(followerId, Arr.fromFoldable(followeeIds)).map(_.toSet))

object ProfileRepositoryImpl:
  val live: URLayer[SkunkPool, ProfileRepositoryImpl] = ZLayer.fromFunction(ProfileRepositoryImpl.apply)
