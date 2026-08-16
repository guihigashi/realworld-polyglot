package com.github.guihigashi.conduit.social

import com.github.guihigashi.conduit.social.grpc.social_graph.*
import com.github.guihigashi.conduit.social.infrastructure.repository.ProfileRepository
import io.grpc.{Status, StatusException}
import zio.*

import java.util.UUID

case class SocialGraphServiceImpl(profileRepository: ProfileRepository) extends ZioSocialGraph.SocialGraphService:

  override def followUser(request: FollowRequest): IO[StatusException, ProfileResponse] =
    ZIO.succeed(ProfileResponse(
      username = request.targetUsername,
      bio = "This is a dummy bio",
      image = "https://example.com/image.png",
      following = true
    ))

  override def unfollowUser(request: UnfollowRequest): IO[StatusException, ProfileResponse] =
    ZIO.succeed(ProfileResponse(
      username = request.targetUsername,
      bio = "This is a dummy bio",
      image = "https://example.com/image.png"
    ))

  override def getProfile(request: GetProfileRequest): IO[StatusException, ProfileResponse] =
    for
      profile <- profileRepository
        .getProfile(request.targetUsername)
        .mapError(e =>
          StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}"))
        )
    yield ProfileResponse(
      username = profile._1,
      bio = profile._2.getOrElse(""),
      image = profile._3.getOrElse(""),
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
