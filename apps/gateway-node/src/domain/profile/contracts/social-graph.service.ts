import type { User } from "@/domain/auth/entities/user.entity.js"
import type { Profile } from "@/domain/profile/entities/profile.entity.js"

export const SOCIAL_GRAPH_SERVICE = Symbol("SOCIAL_GRAPH_SERVICE")

export interface SocialGraphService {
  getProfile(targetUsername: string, requestorId?: string | null): Promise<Profile>
  followUser(followerId: string, targetUsername: string): Promise<Profile>
  unfollowUser(followerId: string, targetUsername: string): Promise<Profile>
  getProfilesByIds(userIds: string[], requestorId?: string | null): Promise<Record<string, Profile>>
  upsertProfileProjection(user: User): Promise<void>
}
