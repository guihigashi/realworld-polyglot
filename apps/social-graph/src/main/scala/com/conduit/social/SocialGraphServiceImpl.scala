package com.conduit.social

import com.conduit.social.grpc.social_graph.*
import io.grpc.StatusException
import zio.*

object SocialGraphServiceImpl extends ZioSocialGraph.SocialGraphService:

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
    ZIO.succeed(ProfileResponse(
      username = request.targetUsername,
      bio = "This is a dummy bio",
      image = "https://example.com/image.png",
    ))
