package com.github.guihigashi.conduit.social

import com.github.guihigashi.conduit.social.delivery.SocialGraphServiceImpl
import com.github.guihigashi.conduit.social.grpc.social_graph.*
import com.github.guihigashi.conduit.social.infrastructure.db.SkunkSessionPool
import com.github.guihigashi.conduit.social.infrastructure.repository.ProfileRepository
import io.grpc.ServerBuilder
import io.grpc.protobuf.services.ProtoReflectionServiceV1
import scalapb.zio_grpc.{ServerLayer, ServiceList}
import zio.*
import zio.config.typesafe.TypesafeConfigProvider
import zio.logging.consoleLogger
import zio.logging.slf4j.bridge.Slf4jBridge

object Main extends ZIOAppDefault:
  override val bootstrap: ZLayer[ZIOAppArgs, Any, Any] =
    Runtime.setConfigProvider(TypesafeConfigProvider.fromResourcePath()) ++
      Runtime.removeDefaultLoggers >>> consoleLogger() >+> Slf4jBridge.init()

  private val serverLayer = ServerLayer.fromServiceList(
    ServerBuilder.forPort(9090).addService(ProtoReflectionServiceV1.newInstance()),
    ServiceList.addFromEnvironment[ZioSocialGraph.RCSocialGraphService]
  )

  def run: ZIO[ZIOAppArgs & Scope, Any, Any] = serverLayer
    .launch
    .provide(
      SocialGraphServiceImpl.live,
      ProfileRepository.live,
      SkunkSessionPool.live
    )
