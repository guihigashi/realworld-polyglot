import { Module } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { join } from "node:path"
import { AuthModule } from "@/auth.module.js"
import { GetFeedUseCase } from "@/application/feed/use-cases/get-feed.use-case.js"
import { grpcConfig } from "@/config/configuration.js"
import { FEED_SERVICE } from "@/domain/feed/contracts/feed.service.js"
import { COM_GITHUB_GUIHIGASHI_CONDUIT_FEED_PACKAGE_NAME } from "@/generated/grpc/feed.js"
import { FEED_GRPC_CLIENT, GrpcFeedService } from "@/infrastructure/feed/grpc-feed.service.js"
import { DEFAULT_GRPC_CHANNEL_OPTIONS } from "@/infrastructure/grpc/grpc-channel-options.js"
import { FeedController } from "@/presentation/http/controllers/feed.controller.js"

@Module({
  imports: [
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: FEED_GRPC_CLIENT,
        inject: [grpcConfig.KEY],
        useFactory: (grpcCfg: ConfigType<typeof grpcConfig>) => ({
          transport: Transport.GRPC,
          options: {
            url: grpcCfg.feedAggregatorTarget,
            package: COM_GITHUB_GUIHIGASHI_CONDUIT_FEED_PACKAGE_NAME,
            protoPath: join(import.meta.dirname, "proto/feed.proto"),
            channelOptions: DEFAULT_GRPC_CHANNEL_OPTIONS,
          },
        }),
      },
    ]),
  ],
  controllers: [FeedController],
  providers: [GrpcFeedService, { provide: FEED_SERVICE, useExisting: GrpcFeedService }, GetFeedUseCase],
  exports: [FEED_SERVICE],
})
export class FeedModule {}
