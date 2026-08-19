package com.github.guihigashi.conduit.social.domain

case class Profile(
    username: String,
    bio: Option[String],
    image: Option[String],
    following: Boolean
)
