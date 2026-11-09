package com.github.guihigashi.conduit.social.domain

import java.util.UUID

case class Profile(
    id: UUID,
    username: String,
    bio: Option[String],
    image: Option[String],
    followsVersion: Long
)
