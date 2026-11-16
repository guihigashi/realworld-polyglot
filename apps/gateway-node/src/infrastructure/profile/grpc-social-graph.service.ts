import { Metadata } from "@grpc/grpc-js"
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common"
import type { ClientGrpc } from "@nestjs/microservices"
import { lastValueFrom } from "rxjs"
import type { User } from "@/domain/auth/entities/user.entity.js"
import type { SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { SOCIAL_GRAPH_SERVICE_NAME, type SocialGraphServiceClient } from "@/generated/grpc/social_graph.js"

export const SOCIAL_GRAPH_GRPC_CLIENT = Symbol("SOCIAL_GRAPH_GRPC_CLIENT")

@Injectable()
export class GrpcSocialGraphService implements SocialGraphService, OnModuleInit {
  private client!: SocialGraphServiceClient

  constructor(
    @Inject(SOCIAL_GRAPH_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.client = this.grpcClient.getService<SocialGraphServiceClient>(SOCIAL_GRAPH_SERVICE_NAME)
  }

  async upsertProfileProjection(user: User): Promise<void> {
    const metadata = new Metadata()
    metadata.set("x-requestor-id", user.getId())

    await lastValueFrom(
      this.client.upsertProfileProjection(
        {
          username: user.getUsername(),
          bio: user.getBio() ?? "",
          image: user.getImage() ?? "",
        },
        metadata,
      ),
    )
  }
}
