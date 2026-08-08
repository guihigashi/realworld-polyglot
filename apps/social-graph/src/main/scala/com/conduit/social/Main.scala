package com.conduit.social

import com.conduit.social.grpc.social_graph.SocialGraphServiceGrpc.SocialGraphService
import io.grpc.netty.NettyServerBuilder
import io.grpc.protobuf.services.ProtoReflectionService
import zio.*

import scala.concurrent.ExecutionContext

object Main extends ZIOAppDefault:
  def run =
    for
      runtime <- ZIO.runtime[Any]
      service = new SocialGraphServiceImpl(runtime)

      _ <- ZIO.attemptBlocking {
        val port = 9090

        NettyServerBuilder
          .forPort(port)
          .addService(SocialGraphService.bindService(service, ExecutionContext.global))
          .addService(ProtoReflectionService.newInstance())
          .build()
          .start()
          .awaitTermination()
      }
    yield ()
