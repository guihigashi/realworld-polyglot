package com.github.guihigashi.conduit.social.domain

import skunk.Codec
import skunk.codec.all.*
import skunk.data.Arr
import zio.json.JsonCodec
import zio.{Task, ZIO}

import java.util.UUID

opaque type RequestorId = UUID

object RequestorId:
  def fromString(s: String): Task[RequestorId] = ZIO.attempt(UUID.fromString(s))
  given JsonCodec[RequestorId]                 = JsonCodec.uuid
  lazy val codec: Codec[RequestorId]           = uuid
  lazy val _codec: Codec[Arr[RequestorId]]     = _uuid
