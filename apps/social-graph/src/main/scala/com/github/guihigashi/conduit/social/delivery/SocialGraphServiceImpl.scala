package com.github.guihigashi.conduit.social.delivery

import com.github.guihigashi.conduit.social.domain.RequestorId
import com.github.guihigashi.conduit.social.domain.exceptions.ProfileNotFoundException
import com.github.guihigashi.conduit.social.grpc.social_graph.*
import com.github.guihigashi.conduit.social.infrastructure.repository.ProfileRepository
import com.google.protobuf.empty.Empty
import io.grpc.Metadata.{ASCII_STRING_MARSHALLER, Key}
import io.grpc.{Status, StatusException}
import scalapb.zio_grpc.RequestContext
import zio.*

import java.util.UUID

case class SocialGraphServiceImpl(profileRepository: ProfileRepository)
    extends ZioSocialGraph.ZSocialGraphService[AppContext]:

  override def getProfile(request: GetProfileRequest, context: AppContext): IO[StatusException, ProfileResponse] =
    (for
      profile   <- profileRepository.getProfile(request.targetUsername)
      following <- context.requestorId match
        case Some(value) => profileRepository.isRequestorFollowing(value, request.targetUsername)
        case None        => ZIO.succeed(false)
    yield ProfileResponse(
      username = profile._1,
      bio = profile._2,
      image = profile._3,
      following = following,
    )).mapError {
      case e: NoSuchElementException => StatusException(Status.NOT_FOUND.withDescription(e.getMessage))
      case e                         => StatusException(Status.INTERNAL.withDescription(e.getMessage))
    }

  override def followUser(request: FollowRequest, context: AppContext): IO[StatusException, ProfileResponse] =
    for
      id <- context.requireRequestorId
      _  <- profileRepository
        .follow(id, request.targetUsername)
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

  override def unfollowUser(request: UnfollowRequest, context: AppContext): IO[StatusException, ProfileResponse] =
    for
      id <- context.requireRequestorId
      _  <- profileRepository
        .unfollow(id, request.targetUsername)
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

  override def getProfilesByIds(
      request: GetProfilesByIdsRequest,
      context: AppContext
  ): IO[StatusException, ProfilesResponse] =
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
        .mapBoth(
          e =>
            StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")),
          _.map((id, p) => id.toString -> ProfileResponse(p._1, p._2, p._3))
        )
    yield ProfilesResponse(profiles)

  override def upsertProfileProjection(
      request: UpsertProfileRequest,
      context: AppContext
  ): IO[StatusException, UpsertProfileResponse] =
    for
      id <- context.requireRequestorId
      _  <- profileRepository
        .upsert(
          userId = id,
          username = request.username,
          bio = Option(request.bio).filter(_.nonEmpty),
          image = Option(request.image).filter(_.nonEmpty)
        )
        .mapError(e => StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")))
    yield UpsertProfileResponse(success = true)

  override def resolveIdsByUsernames(
      request: ResolveIdsByUsernamesRequest,
      context: AppContext
  ): IO[StatusException, ResolveIdsByUsernamesResponse] =
    profileRepository
      .resolveIdsByUsernames(request.usernames.toList)
      .mapBoth(
        e => StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")),
        idList =>
          ResolveIdsByUsernamesResponse(
            idList.map((name, id) => name -> id.fold("")(_.toString)).toMap
          )
      )

  override def getFollowing(request: Empty, context: AppContext): IO[StatusException, GetFollowingResponse] =
    for
      id  <- context.requireRequestorId
      ids <- profileRepository
        .getFollowing(id)
        .mapError(e => StatusException(Status.INTERNAL.withDescription(s"Database error: ${e.getMessage}")))
    yield GetFollowingResponse(ids.map(_.toString))

object SocialGraphServiceImpl:
  private val requestorIdKey: Key[String] = Key.of("x-requestor-id", ASCII_STRING_MARSHALLER)

  def findRequestorId(rc: RequestContext): IO[StatusException, AppContext] =
    rc.metadata
      .get(requestorIdKey)
      .flatMap {
        case Some(value) => RequestorId
            .fromString(value)
            .mapBoth(
              e =>
                StatusException(Status
                  .INVALID_ARGUMENT
                  .withDescription(s"Invalid 'x-requestor-id' format: ${e.getMessage}")),
              id => AppContext(Some(id))
            )
        case None => ZIO.succeed(AppContext(None))
      }

  val live: URLayer[ProfileRepository, ZioSocialGraph.RCSocialGraphService] =
    ZLayer {
      for
        profileRepository <- ZIO.service[ProfileRepository]
      yield SocialGraphServiceImpl(profileRepository).transformContextZIO(findRequestorId)
    }
