import { RequestMethod } from "@nestjs/common"
import type { NestNodeApplication } from "@nestjs/platform-node"
import { NodeAdapter } from "@nestjs/platform-node"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { AppModule } from "@/app.module.js"
import { JWT_GENERATOR, type JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { EVENT_PUBLISHER } from "@/domain/contracts/event-publisher.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { Profile } from "@/domain/profile/entities/profile.entity.js"
import { ProfileNotFoundException } from "@/domain/profile/exceptions/profile.exceptions.js"
import { InMemoryEventPublisher } from "@/infrastructure/messaging/in-memory-event-publisher.js"

class InMemorySocialGraphService implements SocialGraphService {
  private readonly profiles = new Map<
    string,
    { id: string; username: string; bio: string | null; image: string | null }
  >()
  private readonly follows = new Map<string, Set<string>>()
  private versionCounter = 0

  async upsertProfileProjection(user: User): Promise<void> {
    this.profiles.set(user.getUsername(), {
      id: user.getId(),
      username: user.getUsername(),
      bio: user.getBio(),
      image: user.getImage(),
    })
  }

  async getProfile(targetUsername: string, requestorId?: string | null): Promise<Profile> {
    const target = this.profiles.get(targetUsername)
    if (!target) {
      throw new ProfileNotFoundException()
    }

    const following = requestorId ? (this.follows.get(requestorId)?.has(target.username) ?? false) : false
    return new Profile({
      username: target.username,
      bio: target.bio,
      image: target.image,
      following,
      followsVersion: this.versionCounter,
    })
  }

  async followUser(followerId: string, targetUsername: string): Promise<Profile> {
    const target = this.profiles.get(targetUsername)
    if (!target) {
      throw new ProfileNotFoundException()
    }

    let set = this.follows.get(followerId)
    if (!set) {
      set = new Set()
      this.follows.set(followerId, set)
    }
    set.add(target.username)
    this.versionCounter += 1

    return new Profile({
      username: target.username,
      bio: target.bio,
      image: target.image,
      following: true,
      followsVersion: this.versionCounter,
    })
  }

  async unfollowUser(followerId: string, targetUsername: string): Promise<Profile> {
    const target = this.profiles.get(targetUsername)
    if (!target) {
      throw new ProfileNotFoundException()
    }

    this.follows.get(followerId)?.delete(target.username)
    this.versionCounter += 1

    return new Profile({
      username: target.username,
      bio: target.bio,
      image: target.image,
      following: false,
      followsVersion: this.versionCounter,
    })
  }

  async getProfilesByIds(userIds: string[], requestorId?: string | null): Promise<Record<string, Profile>> {
    const result: Record<string, Profile> = {}
    for (const profile of this.profiles.values()) {
      if (userIds.includes(profile.id)) {
        const following = requestorId ? (this.follows.get(requestorId)?.has(profile.username) ?? false) : false
        result[profile.id] = new Profile({
          username: profile.username,
          bio: profile.bio,
          image: profile.image,
          following,
        })
      }
    }
    return result
  }
}

describe("Profiles and Social Graph (e2e)", () => {
  let app: NestNodeApplication
  let socialGraph: InMemorySocialGraphService
  let jwtGenerator: JwtGenerator

  beforeEach(async () => {
    socialGraph = new InMemorySocialGraphService()
    const dummyUserRepo: UserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      save: vi.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOCIAL_GRAPH_SERVICE)
      .useValue(socialGraph)
      .overrideProvider(USER_REPOSITORY)
      .useValue(dummyUserRepo)
      .overrideProvider(EVENT_PUBLISHER)
      .useValue(new InMemoryEventPublisher())
      .compile()

    jwtGenerator = moduleRef.get<JwtGenerator>(JWT_GENERATOR)

    app = moduleRef.createNestApplication<NestNodeApplication>(new NodeAdapter())
    app.setGlobalPrefix("api", {
      exclude: [{ path: "", method: RequestMethod.GET }],
    })
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  async function seedUser(id: string, username: string, bio: string | null = null, image: string | null = null) {
    const user = new User({
      id,
      username,
      email: `${username}@test.com`,
      passwordHash: "hash",
      bio,
      image,
    })
    await socialGraph.upsertProfileProjection(user)
    return jwtGenerator.generateForUser(user)
  }

  it("gets profile without auth and with optional auth", async () => {
    const viewerToken = await seedUser("usr-1", "viewer")
    await seedUser("usr-2", "celeb")

    const unauthedRes = await request(app.getHttpServer()).get("/api/profiles/celeb").expect(200)
    expect(unauthedRes.body).toEqual({
      profile: {
        username: "celeb",
        bio: null,
        image: null,
        following: false,
      },
    })
    expect(unauthedRes.body.profile).not.toHaveProperty("followsVersion")

    const authedRes = await request(app.getHttpServer())
      .get("/api/profiles/celeb")
      .set("Authorization", `Token ${viewerToken}`)
      .expect(200)
    expect(authedRes.body).toEqual({
      profile: {
        username: "celeb",
        bio: null,
        image: null,
        following: false,
      },
    })
  })

  it("follows and unfollows a profile, persisting state and setting X-Follows-Version header", async () => {
    const viewerToken = await seedUser("usr-1", "viewer")
    await seedUser("usr-2", "celeb", "I am famous", "https://example.com/celeb.png")

    const followRes = await request(app.getHttpServer())
      .post("/api/profiles/celeb/follow")
      .set("Authorization", `Token ${viewerToken}`)
      .expect(200)

    expect(followRes.headers["x-follows-version"]).toBe("1")
    expect(followRes.body).toEqual({
      profile: {
        username: "celeb",
        bio: "I am famous",
        image: "https://example.com/celeb.png",
        following: true,
      },
    })
    expect(followRes.body.profile).not.toHaveProperty("followsVersion")

    const afterFollow = await request(app.getHttpServer())
      .get("/api/profiles/celeb")
      .set("Authorization", `Token ${viewerToken}`)
      .expect(200)
    expect(afterFollow.body.profile.following).toBe(true)

    const unfollowRes = await request(app.getHttpServer())
      .delete("/api/profiles/celeb/follow")
      .set("Authorization", `Token ${viewerToken}`)
      .expect(200)

    expect(unfollowRes.headers["x-follows-version"]).toBe("2")
    expect(unfollowRes.body).toEqual({
      profile: {
        username: "celeb",
        bio: "I am famous",
        image: "https://example.com/celeb.png",
        following: false,
      },
    })

    const afterUnfollow = await request(app.getHttpServer())
      .get("/api/profiles/celeb")
      .set("Authorization", `Token ${viewerToken}`)
      .expect(200)
    expect(afterUnfollow.body.profile.following).toBe(false)
  })

  it("returns RealWorld 401 and 404 error contracts", async () => {
    const token = await seedUser("usr-1", "viewer")

    await request(app.getHttpServer())
      .get("/api/profiles/unknown-user")
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { profile: ["not found"] } })
      })

    await request(app.getHttpServer())
      .post("/api/profiles/unknown-user/follow")
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { token: ["is missing"] } })
      })

    await request(app.getHttpServer())
      .delete("/api/profiles/unknown-user/follow")
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { token: ["is missing"] } })
      })

    await request(app.getHttpServer())
      .post("/api/profiles/unknown-user/follow")
      .set("Authorization", `Token ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { profile: ["not found"] } })
      })

    await request(app.getHttpServer())
      .delete("/api/profiles/unknown-user/follow")
      .set("Authorization", `Token ${token}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { profile: ["not found"] } })
      })
  })
})
