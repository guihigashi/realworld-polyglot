import { type Metadata, status } from "@grpc/grpc-js"
import type { ClientGrpc } from "@nestjs/microservices"
import { of, throwError } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { User } from "@/domain/auth/entities/user.entity.js"
import { ProfileNotFoundException } from "@/domain/profile/exceptions/profile.exceptions.js"
import type { ProfileResponse, SocialGraphServiceClient } from "@/generated/grpc/social_graph.js"
import { GrpcSocialGraphService } from "@/infrastructure/profile/grpc-social-graph.service.js"

function createServiceWithMockClient() {
  const getProfile = vi.fn<SocialGraphServiceClient["getProfile"]>()
  const followUser = vi.fn<SocialGraphServiceClient["followUser"]>()
  const unfollowUser = vi.fn<SocialGraphServiceClient["unfollowUser"]>()
  const getProfilesByIds = vi.fn<SocialGraphServiceClient["getProfilesByIds"]>()
  const upsertProfileProjection = vi.fn<SocialGraphServiceClient["upsertProfileProjection"]>()
  const resolveIdsByUsernames = vi.fn<SocialGraphServiceClient["resolveIdsByUsernames"]>()
  const getFollowing = vi.fn<SocialGraphServiceClient["getFollowing"]>()

  const clientMock: SocialGraphServiceClient = {
    getProfile,
    followUser,
    unfollowUser,
    getProfilesByIds,
    upsertProfileProjection,
    resolveIdsByUsernames,
    getFollowing,
  }

  const grpcClient = {
    getService: vi.fn().mockReturnValue(clientMock),
  } as unknown as ClientGrpc

  const service = new GrpcSocialGraphService(grpcClient)
  service.onModuleInit()

  return {
    service,
    getProfile,
    followUser,
    unfollowUser,
    getProfilesByIds,
    upsertProfileProjection,
  }
}

describe("GrpcSocialGraphService", () => {
  it("gets a profile without x-requestor-id when requestorId is null", async () => {
    const { service, getProfile } = createServiceWithMockClient()
    getProfile.mockReturnValue(
      of({
        username: "celeb",
        bio: undefined,
        image: undefined,
      } as unknown as ProfileResponse),
    )

    const profile = await service.getProfile("celeb", null)

    expect(profile.username).toBe("celeb")
    expect(profile.bio).toBeNull()
    expect(profile.image).toBeNull()
    expect(profile.following).toBe(false)
    expect(profile.followsVersion).toBe(0)
    expect(profile.toJSON()).toEqual({
      username: "celeb",
      bio: null,
      image: null,
      following: false,
    })

    const [req, metadata] = getProfile.mock.calls[0]
    expect(req).toEqual({ targetUsername: "celeb" })
    expect((metadata as Metadata).get("x-requestor-id")).toEqual([])
  })

  it("sends x-requestor-id metadata when requestorId is provided", async () => {
    const { service, getProfile } = createServiceWithMockClient()
    getProfile.mockReturnValue(
      of({
        username: "celeb",
        bio: "Hello",
        image: "https://example.com/a.jpg",
        following: true,
        followsVersion: 7,
      }),
    )

    const profile = await service.getProfile("celeb", "usr-123")

    expect(profile.bio).toBe("Hello")
    expect(profile.image).toBe("https://example.com/a.jpg")
    expect(profile.following).toBe(true)
    expect(profile.followsVersion).toBe(7)

    const [, metadata] = getProfile.mock.calls[0]
    expect((metadata as Metadata).get("x-requestor-id")).toEqual(["usr-123"])
  })

  it("follows and unfollows a user with followerId metadata and returns followsVersion", async () => {
    const { service, followUser, unfollowUser } = createServiceWithMockClient()
    followUser.mockReturnValue(
      of({
        username: "celeb",
        bio: undefined,
        image: undefined,
        following: true,
        followsVersion: 11,
      }),
    )
    unfollowUser.mockReturnValue(
      of({
        username: "celeb",
        bio: undefined,
        image: undefined,
        following: false,
        followsVersion: 12,
      }),
    )

    const followed = await service.followUser("usr-1", "celeb")
    expect(followed.following).toBe(true)
    expect(followed.followsVersion).toBe(11)
    expect((followUser.mock.calls[0][1] as Metadata).get("x-requestor-id")).toEqual(["usr-1"])

    const unfollowed = await service.unfollowUser("usr-1", "celeb")
    expect(unfollowed.following).toBe(false)
    expect(unfollowed.followsVersion).toBe(12)
    expect((unfollowUser.mock.calls[0][1] as Metadata).get("x-requestor-id")).toEqual(["usr-1"])
  })

  it("maps gRPC NOT_FOUND to ProfileNotFoundException and rethrows other errors", async () => {
    const { service, getProfile, followUser, unfollowUser } = createServiceWithMockClient()
    const notFoundErr = Object.assign(new Error("not found"), { code: status.NOT_FOUND })
    const unavailableErr = Object.assign(new Error("unavailable"), { code: status.UNAVAILABLE })

    getProfile.mockReturnValueOnce(throwError(() => notFoundErr))
    followUser.mockReturnValueOnce(throwError(() => notFoundErr))
    unfollowUser.mockReturnValueOnce(throwError(() => notFoundErr))
    getProfile.mockReturnValueOnce(throwError(() => unavailableErr))

    await expect(service.getProfile("missing", null)).rejects.toThrow(ProfileNotFoundException)
    await expect(service.followUser("usr-1", "missing")).rejects.toThrow(ProfileNotFoundException)
    await expect(service.unfollowUser("usr-1", "missing")).rejects.toThrow(ProfileNotFoundException)
    await expect(service.getProfile("celeb", null)).rejects.toThrow("unavailable")
  })

  it("gets profiles by ids and short-circuits empty list", async () => {
    const { service, getProfilesByIds } = createServiceWithMockClient()
    expect(await service.getProfilesByIds([], "usr-1")).toEqual({})
    expect(getProfilesByIds).not.toHaveBeenCalled()

    getProfilesByIds.mockReturnValue(
      of({
        profiles: {
          "usr-2": {
            username: "bob",
            bio: "Bob bio",
            image: undefined,
            following: true,
            followsVersion: 0,
          },
        },
      }),
    )

    const result = await service.getProfilesByIds(["usr-2"], "usr-1")
    expect(result["usr-2"].toJSON()).toEqual({
      username: "bob",
      bio: "Bob bio",
      image: null,
      following: true,
    })
    const [req, metadata] = getProfilesByIds.mock.calls[0]
    expect(req).toEqual({ userIds: ["usr-2"] })
    expect((metadata as Metadata).get("x-requestor-id")).toEqual(["usr-1"])
  })

  it("projects user profile with x-requestor-id metadata", async () => {
    const { service, upsertProfileProjection } = createServiceWithMockClient()
    upsertProfileProjection.mockReturnValue(of({ success: true }))

    const user = new User({
      id: "usr-9",
      username: "alice",
      email: "alice@example.com",
      passwordHash: "hash",
      bio: null,
      image: "https://example.com/pic.png",
    })

    await service.upsertProfileProjection(user)

    const [req, metadata] = upsertProfileProjection.mock.calls[0]
    expect(req).toEqual({
      username: "alice",
      bio: "",
      image: "https://example.com/pic.png",
    })
    expect((metadata as Metadata).get("x-requestor-id")).toEqual(["usr-9"])
  })
})
