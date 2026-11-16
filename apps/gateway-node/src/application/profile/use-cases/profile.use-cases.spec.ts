import { describe, expect, it, vi } from "vitest"
import { FollowUserUseCase } from "@/application/profile/use-cases/follow-user.use-case.js"
import { GetProfileUseCase } from "@/application/profile/use-cases/get-profile.use-case.js"
import { UnfollowUserUseCase } from "@/application/profile/use-cases/unfollow-user.use-case.js"
import type { SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { Profile } from "@/domain/profile/entities/profile.entity.js"
import { ProfileNotFoundException } from "@/domain/profile/exceptions/profile.exceptions.js"

function createSocialGraphMock() {
  const getProfile = vi.fn<SocialGraphService["getProfile"]>()
  const followUser = vi.fn<SocialGraphService["followUser"]>()
  const unfollowUser = vi.fn<SocialGraphService["unfollowUser"]>()
  const upsertProfileProjection = vi.fn<SocialGraphService["upsertProfileProjection"]>()

  const socialGraph: SocialGraphService = {
    getProfile,
    followUser,
    unfollowUser,
    upsertProfileProjection,
  }

  return { socialGraph, getProfile, followUser, unfollowUser }
}

describe("Profile use cases", () => {
  it("GetProfileUseCase delegates to SocialGraphService with optional requestorId", async () => {
    const { socialGraph, getProfile } = createSocialGraphMock()
    const expected = new Profile({ username: "celeb", bio: null, image: null, following: false })
    getProfile.mockResolvedValue(expected)

    const useCase = new GetProfileUseCase(socialGraph)

    const unauthed = await useCase.execute("celeb", null)
    expect(unauthed).toBe(expected)
    expect(getProfile).toHaveBeenCalledWith("celeb", null)

    await useCase.execute("celeb", "usr-1")
    expect(getProfile).toHaveBeenCalledWith("celeb", "usr-1")
  })

  it("FollowUserUseCase delegates to SocialGraphService and propagates ProfileNotFoundException", async () => {
    const { socialGraph, followUser } = createSocialGraphMock()
    const followed = new Profile({
      username: "celeb",
      bio: "Bio",
      image: "https://example.com/img.png",
      following: true,
      followsVersion: 42,
    })
    followUser.mockResolvedValueOnce(followed).mockRejectedValueOnce(new ProfileNotFoundException())

    const useCase = new FollowUserUseCase(socialGraph)

    const result = await useCase.execute("usr-1", "celeb")
    expect(result).toBe(followed)
    expect(followUser).toHaveBeenCalledWith("usr-1", "celeb")

    await expect(useCase.execute("usr-1", "missing")).rejects.toThrow(ProfileNotFoundException)
  })

  it("UnfollowUserUseCase delegates to SocialGraphService", async () => {
    const { socialGraph, unfollowUser } = createSocialGraphMock()
    const unfollowed = new Profile({
      username: "celeb",
      bio: null,
      image: null,
      following: false,
      followsVersion: 43,
    })
    unfollowUser.mockResolvedValue(unfollowed)

    const useCase = new UnfollowUserUseCase(socialGraph)

    const result = await useCase.execute("usr-1", "celeb")
    expect(result).toBe(unfollowed)
    expect(unfollowUser).toHaveBeenCalledWith("usr-1", "celeb")
  })
})
