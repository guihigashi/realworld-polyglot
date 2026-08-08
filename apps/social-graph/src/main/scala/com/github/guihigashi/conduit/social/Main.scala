package com.github.guihigashi.conduit.social

import io.grpc.ServerBuilder
import io.grpc.protobuf.services.ProtoReflectionServiceV1
import scalapb.zio_grpc.{ServerLayer, ServiceList}
import zio.*

object Main extends ZIOAppDefault:
  private val serverLayer = ServerLayer.fromServiceList(
    ServerBuilder.forPort(9090).addService(ProtoReflectionServiceV1.newInstance()),
    ServiceList.add(SocialGraphServiceImpl)
  )

  def run = serverLayer.launch
