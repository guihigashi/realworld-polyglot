package com.github.guihigashi.conduit.social.infrastructure.messaging

import com.github.guihigashi.conduit.social.domain.RequestorId
import zio.json.*
import java.time.Instant
import java.util.UUID

case class UserFollowedPayload(
    followerId: RequestorId,
    followedId: UUID,
    followedUsername: String,
    followedAt: Instant
)
object UserFollowedPayload:
  given JsonEncoder[UserFollowedPayload] = DeriveJsonEncoder.gen[UserFollowedPayload]

case class UserFollowedEvent(
    eventId: UUID,
    eventType: String,
    aggregateId: RequestorId,
    timestamp: Instant,
    payload: UserFollowedPayload
)
object UserFollowedEvent:
  given JsonEncoder[UserFollowedEvent] = DeriveJsonEncoder.gen[UserFollowedEvent]

case class UserUnfollowedPayload(
    followerId: RequestorId,
    followedId: UUID,
    followedUsername: String,
    unfollowedAt: Instant
)
object UserUnfollowedPayload:
  given JsonEncoder[UserUnfollowedPayload] = DeriveJsonEncoder.gen[UserUnfollowedPayload]

case class UserUnfollowedEvent(
    eventId: UUID,
    eventType: String,
    aggregateId: RequestorId,
    timestamp: Instant,
    payload: UserUnfollowedPayload
)
object UserUnfollowedEvent:
  given JsonEncoder[UserUnfollowedEvent] = DeriveJsonEncoder.gen[UserUnfollowedEvent]
