package com.github.guihigashi.conduit.social.delivery

import com.github.guihigashi.conduit.social.domain.RequestorId
import io.grpc.{Status, StatusException}
import zio.*

case class AppContext(requestorId: Option[RequestorId]):
  def requireRequestorId: IO[StatusException, RequestorId] =
    ZIO
      .fromOption(requestorId)
      .orElseFail(StatusException(Status.UNAUTHENTICATED.withDescription("Requestor ID is missing")))
