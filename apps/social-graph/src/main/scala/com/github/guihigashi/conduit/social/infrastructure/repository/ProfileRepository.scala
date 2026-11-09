package com.github.guihigashi.conduit.social.infrastructure.repository

import com.github.guihigashi.conduit.social.domain.{Profile, RequestorId}
import zio.*

import java.util.UUID

trait ProfileRepository:
  def getProfile(username: String): Task[Profile]
  def follow(followerId: RequestorId, followeeUsername: String): Task[Long]
  def unfollow(followerId: RequestorId, followeeUsername: String): Task[Long]
  def getProfilesByIds(ids: List[UUID]): Task[Map[UUID, (String, Option[String], Option[String])]]
  def upsert(userId: RequestorId, username: String, bio: Option[String], image: Option[String]): Task[Unit]
  def resolveIdsByUsernames(usernames: List[String]): Task[List[(String, Option[UUID])]]
  def getFollowing(id: RequestorId): Task[(List[UUID], Long)]
  def isRequestorFollowing(followerId: RequestorId, followeeUsername: String): Task[Boolean]
  def isRequestorFollowingIds(followerId: RequestorId, followeeIds: List[UUID]): Task[Set[UUID]]
