import { Module } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { join } from "node:path"
import { grpcConfig } from "@/config/configuration.js"
import { SOCIAL_GRAPH_SERVICE } from "@/domain/profile/contracts/social-graph.service.js"
import { COM_GITHUB_GUIHIGASHI_CONDUIT_SOCIAL_PACKAGE_NAME } from "@/generated/grpc/social_graph.js"
import { GrpcSocialGraphService, SOCIAL_GRAPH_GRPC_CLIENT } from "@/infrastructure/profile/grpc-social-graph.service.js"

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SOCIAL_GRAPH_GRPC_CLIENT,
        inject: [grpcConfig.KEY],
        useFactory: (grpcCfg: ConfigType<typeof grpcConfig>) => ({
          transport: Transport.GRPC,
          options: {
            url: grpcCfg.socialGraphTarget,
            package: COM_GITHUB_GUIHIGASHI_CONDUIT_SOCIAL_PACKAGE_NAME,
            protoPath: join(import.meta.dirname, "../../proto/social_graph.proto"),
          },
        }),
      },
    ]),
  ],
  providers: [GrpcSocialGraphService, { provide: SOCIAL_GRAPH_SERVICE, useExisting: GrpcSocialGraphService }],
  exports: [SOCIAL_GRAPH_SERVICE],
})
export class SocialGraphModule {}
