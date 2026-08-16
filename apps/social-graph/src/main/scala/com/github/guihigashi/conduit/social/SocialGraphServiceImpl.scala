package com.github.guihigashi.conduit.social

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
        .mapError(e =>
          StatusException(Status.INVALID_ARGUMENT.withDescription(s"Failed to follow user: ${e.getMessage}"))
        )
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
        .mapError(e =>
          StatusException(Status.INVALID_ARGUMENT.withDescription(s"Failed to unfollow user: ${e.getMessage}"))
        )
    yield ProfileResponse(
      username = request.targetUsername,
      bio = None,
      image = None,
    )

  override def getProfile(request: GetProfileRequest): IO[StatusException, ProfileResponse] =
    for
      profile <- profileRepository
        .getProfile(request.targetUsername)
        .mapError(e =>
          StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}"))
        )
    yield ProfileResponse(
      username = profile._1,
      bio = profile._2,
      image = profile._3,
    )

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

object SocialGraphServiceImpl:
  val live: URLayer[ProfileRepository, ZioSocialGraph.SocialGraphService] =
    ZLayer.fromFunction(SocialGraphServiceImpl.apply)
