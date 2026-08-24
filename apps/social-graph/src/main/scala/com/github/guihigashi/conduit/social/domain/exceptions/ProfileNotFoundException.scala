package com.github.guihigashi.conduit.social.domain.exceptions

case class ProfileNotFoundException(username: String)
    extends RuntimeException(s"profile not found: $username")
