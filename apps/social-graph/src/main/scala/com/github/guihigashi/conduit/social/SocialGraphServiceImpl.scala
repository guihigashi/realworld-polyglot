package com.github.guihigashi.conduit.social

import com.github.guihigashi.conduit.social.domain.exceptions.ProfileNotFoundException
import com.github.guihigashi.conduit.social.grpc.social_graph.*
import com.github.guihigashi.conduit.social.infrastructure.repository.ProfileRepository
import io.grpc.{Status, StatusException}
import zio.*

import java.util.UUID

case class SocialGraphServiceImpl(profileRepository: ProfileRepository) extends ZioSocialGraph.SocialGraphService:

  override def followUser(request: FollowRequest): IO[StatusException, ProfileResponse] =
    for
      followerId <- ZIO
        .attempt(UUID.fromString(request.followerId))
        .mapError(e =>
          StatusException(Status.INVALID_ARGUMENT.withDescription(s"Invalid follower_id: ${e.getMessage}"))
        )
      _ <- profileRepository
        .follow(followerId, request.targetUsername)
        .mapError {
          case e: ProfileNotFoundException =>
            StatusException(Status.NOT_FOUND.withDescription(s"Failed to follow user: ${e.getMessage}"))
          case e => StatusException(Status.INVALID_ARGUMENT.withDescription(s"Failed to follow user: ${e.getMessage}"))
        }
    yield ProfileResponse(
      username = request.targetUsername,
      bio = None,
      image = None,
      following = true
    )

  override def unfollowUser(request: UnfollowRequest): IO[StatusException, ProfileResponse] =
    for
      followerId <- ZIO
        .attempt(UUID.fromString(request.followerId))
        .mapError(e =>
          StatusException(Status.INVALID_ARGUMENT.withDescription(s"Invalid follower_id: ${e.getMessage}"))
        )
      _ <- profileRepository
        .unfollow(followerId, request.targetUsername)
        .mapError {
          case e: ProfileNotFoundException =>
            StatusException(Status.NOT_FOUND.withDescription(s"Failed to follow user: ${e.getMessage}"))
          case e =>
            StatusException(Status.INVALID_ARGUMENT.withDescription(s"Failed to unfollow user: ${e.getMessage}"))
        }
    yield ProfileResponse(
      username = request.targetUsername,
      bio = None,
      image = None,
    )

  override def getProfile(request: GetProfileRequest): IO[StatusException, ProfileResponse] =
    for
      profile <- profileRepository
        .getProfile(request.targetUsername)
        .mapError {
          case e: NoSuchElementException => StatusException(Status.NOT_FOUND.withDescription(e.getMessage))
          case e                         => StatusException(Status.INTERNAL.withDescription(e.getMessage))
        }
        .debug
    yield ProfileResponse(
      username = profile._1,
      bio = profile._2,
      image = profile._3,
    )

  override def getProfilesByIds(request: GetProfilesByIdsRequest): IO[StatusException, ProfilesResponse] =
    for
      ids <- ZIO
        .foreach(request.userIds.toList) { id =>
          ZIO.attempt(UUID.fromString(id))
        }
        .mapError(e =>
          StatusException(Status.INVALID_ARGUMENT.withDescription(s"Invalid user_id format: ${e.getMessage}"))
        )
      profiles <- profileRepository
        .getProfilesByIds(ids)
        .mapError(e =>
          StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}"))
        )
        .map(_.map((id, p) => id.toString -> ProfileResponse(p._1, p._2, p._3)))
    yield ProfilesResponse(profiles)

  override def upsertProfileProjection(request: UpsertProfileRequest): IO[StatusException, UpsertProfileResponse] =
    for
      userId <- ZIO
        .attempt(UUID.fromString(request.userId))
        .mapError(_ =>
          StatusException(Status.INVALID_ARGUMENT.withDescription(s"Invalid user_id format: ${request.userId}"))
        )
      _ <- profileRepository
        .upsert(
          userId = userId,
          username = request.username,
          bio = Option(request.bio).filter(_.nonEmpty),
          image = Option(request.image).filter(_.nonEmpty)
        )
        .mapError(e => StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")))
    yield UpsertProfileResponse(success = true)

  override def resolveIdsByUsernames(request: ResolveIdsByUsernamesRequest)
      : IO[StatusException, ResolveIdsByUsernamesResponse] =
    profileRepository
      .resolveIdsByUsernames(request.usernames.toList)
      .mapError(e => StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")))
      .map { idMap =>
        ResolveIdsByUsernamesResponse(
          idMap.map((name, id) => name -> id.fold("")(_.toString)).toMap
        )
      }

  override def getFollowing(request: GetFollowingRequest): IO[StatusException, GetFollowingResponse] =
    for
      userId <- ZIO
        .attempt(UUID.fromString(request.requestorId))
        .mapError(_ =>
          StatusException(Status
            .INVALID_ARGUMENT
            .withDescription(s"Invalid requestor_id format: ${request.requestorId}"))
        )
      ids <- profileRepository
        .getFollowing(userId)
        .mapError(e => StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")))
    yield GetFollowingResponse(ids.map(_.toString))

object SocialGraphServiceImpl:
  val live: URLayer[ProfileRepository, ZioSocialGraph.SocialGraphService] =
    ZLayer.fromFunction(SocialGraphServiceImpl.apply)
