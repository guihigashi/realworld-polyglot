package com.github.guihigashi.conduit.social.infrastructure.messaging

import com.github.guihigashi.conduit.social.domain.RequestorId
import zio.json.*

import java.time.Instant
import java.util.UUID

case class FollowEventPayload(
    followerId: RequestorId,
    followedId: UUID,
    version: Long
)
object FollowEventPayload:
  given JsonEncoder[FollowEventPayload] = DeriveJsonEncoder.gen[FollowEventPayload]

case class FollowEvent(
    eventId: UUID,
    eventType: String,
    aggregateId: RequestorId,
    timestamp: Instant,
    payload: FollowEventPayload
)
object FollowEvent:
  given JsonEncoder[FollowEvent] = DeriveJsonEncoder.gen[FollowEvent]
