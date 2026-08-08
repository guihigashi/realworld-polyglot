package com.conduit.social

import com.conduit.social.grpc.social_graph.*
import zio.*

import scala.concurrent.Future

class SocialGraphServiceImpl(runtime: Runtime[Any]) extends SocialGraphServiceGrpc.SocialGraphService:

  private def runToFuture[A](effect: Task[A]): Future[A] =
    Unsafe.unsafe { implicit unsafe =>
      runtime.unsafe.runToFuture(effect)
    }

  /**
   * Follow a user
   */
  override def followUser(request: FollowRequest): Future[ProfileResponse] =
    val effect = ZIO.succeed(ProfileResponse(
      username = request.targetUsername,
      bio = "This is a dummy bio",
      image = "https://example.com/image.png",
      following = true
    ))
    runToFuture(effect)

  /**
   * Unfollow a user
   */
  override def unfollowUser(request: UnfollowRequest): Future[ProfileResponse] =
    val effect = ZIO.succeed(ProfileResponse(
      username = request.targetUsername,
      bio = "This is a dummy bio",
      image = "https://example.com/image.png"
    ))
    runToFuture(effect)

  /**
   * Get a user's profile (including if the current user follows them)
   */
  override def getProfile(request: GetProfileRequest): Future[ProfileResponse] =
    val effect = ZIO.succeed(ProfileResponse(
      username = request.targetUsername,
      bio = "This is a dummy bio",
      image = "https://example.com/image.png",
    ))
    runToFuture(effect)
