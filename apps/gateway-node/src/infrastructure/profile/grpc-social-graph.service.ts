import { Metadata, status } from "@grpc/grpc-js"
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common"
import type { ClientGrpc } from "@nestjs/microservices"
import { lastValueFrom } from "rxjs"
import type { User } from "@/domain/auth/entities/user.entity.js"
import type { SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { Profile } from "@/domain/profile/entities/profile.entity.js"
import { ProfileNotFoundException } from "@/domain/profile/exceptions/profile.exceptions.js"
import {
  type ProfileResponse,
  SOCIAL_GRAPH_SERVICE_NAME,
  type SocialGraphServiceClient,
} from "@/generated/grpc/social_graph.js"

export const SOCIAL_GRAPH_GRPC_CLIENT = Symbol("SOCIAL_GRAPH_GRPC_CLIENT")

function isGrpcNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === status.NOT_FOUND
  )
}

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

  async getProfile(targetUsername: string, requestorId?: string | null): Promise<Profile> {
    try {
      const response = await lastValueFrom(
        this.client.getProfile({ targetUsername }, this.createRequestorMetadata(requestorId)),
      )
      return this.toProfile(response)
    } catch (error) {
      if (isGrpcNotFoundError(error)) {
        throw new ProfileNotFoundException()
      }
      throw error
    }
  }

  async followUser(followerId: string, targetUsername: string): Promise<Profile> {
    try {
      const response = await lastValueFrom(
        this.client.followUser({ targetUsername }, this.createRequestorMetadata(followerId)),
      )
      return this.toProfile(response)
    } catch (error) {
      if (isGrpcNotFoundError(error)) {
        throw new ProfileNotFoundException()
      }
      throw error
    }
  }

  async unfollowUser(followerId: string, targetUsername: string): Promise<Profile> {
    try {
      const response = await lastValueFrom(
        this.client.unfollowUser({ targetUsername }, this.createRequestorMetadata(followerId)),
      )
      return this.toProfile(response)
    } catch (error) {
      if (isGrpcNotFoundError(error)) {
        throw new ProfileNotFoundException()
      }
      throw error
    }
  }

  async upsertProfileProjection(user: User): Promise<void> {
    await lastValueFrom(
      this.client.upsertProfileProjection(
        {
          username: user.getUsername(),
          bio: user.getBio() ?? "",
          image: user.getImage() ?? "",
        },
        this.createRequestorMetadata(user.getId()),
      ),
    )
  }

  private createRequestorMetadata(requestorId?: string | null): Metadata {
    const metadata = new Metadata()
    if (requestorId) {
      metadata.set("x-requestor-id", requestorId)
    }
    return metadata
  }

  private toProfile(response: ProfileResponse): Profile {
    return new Profile({
      username: response.username,
      bio: response.bio ?? null,
      image: response.image ?? null,
      following: response.following,
      followsVersion: Number(response.followsVersion ?? 0),
    })
  }
}
