import { Inject, Injectable } from "@nestjs/common"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import type { Profile } from "@/domain/profile/entities/profile.entity.js"

@Injectable()
export class UnfollowUserUseCase {
  constructor(
    @Inject(SOCIAL_GRAPH_SERVICE)
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async execute(followerId: string, targetUsername: string): Promise<Profile> {
    return this.socialGraphService.unfollowUser(followerId, targetUsername)
  }
}
