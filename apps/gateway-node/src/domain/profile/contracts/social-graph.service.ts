import type { User } from "@/domain/auth/entities/user.entity.js"

export const SOCIAL_GRAPH_SERVICE = Symbol("SOCIAL_GRAPH_SERVICE")

export interface SocialGraphService {
  upsertProfileProjection(user: User): Promise<void>
}
