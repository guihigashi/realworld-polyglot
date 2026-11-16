import { RequestMethod } from "@nestjs/common"
import type { NestNodeApplication } from "@nestjs/platform-node"
import { NodeAdapter } from "@nestjs/platform-node"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { AppModule } from "@/app.module.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { EVENT_PUBLISHER } from "@/domain/contracts/event-publisher.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { InMemoryEventPublisher } from "@/infrastructure/messaging/in-memory-event-publisher.js"

class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>()

  constructor(private readonly socialGraphService: SocialGraphService) {}

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.usersById.values()) {
      if (user.getEmail() === email) {
        return user
      }
    }
    return null
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.usersById.values()) {
      if (user.getUsername() === username) {
        return user
      }
    }
    return null
  }

  async save(user: User): Promise<void> {
    this.usersById.set(user.getId(), user)
    await this.socialGraphService.upsertProfileProjection(user)
  }

  clear(): void {
    this.usersById.clear()
  }
}

describe("User and Authentication (e2e)", () => {
  let app: NestNodeApplication
  let userRepo: InMemoryUserRepository
  let eventPublisher: InMemoryEventPublisher
  let upsertProfileProjection: ReturnType<typeof vi.fn<(user: User) => Promise<void>>>

  beforeEach(async () => {
    upsertProfileProjection = vi.fn<(user: User) => Promise<void>>().mockResolvedValue(undefined)
    const socialGraphMock: SocialGraphService = {
      getProfile: vi.fn(),
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
      upsertProfileProjection,
    }
    userRepo = new InMemoryUserRepository(socialGraphMock)
    eventPublisher = new InMemoryEventPublisher()

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOCIAL_GRAPH_SERVICE)
      .useValue(socialGraphMock)
      .overrideProvider(USER_REPOSITORY)
      .useValue(userRepo)
      .overrideProvider(EVENT_PUBLISHER)
      .useValue(eventPublisher)
      .compile()

    app = moduleRef.createNestApplication<NestNodeApplication>(new NodeAdapter())
    app.setGlobalPrefix("api", {
      exclude: [{ path: "", method: RequestMethod.GET }],
    })
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  async function registerUser(username = "testuser", email = "test@example.com", password = "password123") {
    const res = await request(app.getHttpServer())
      .post("/api/users")
      .send({ user: { username, email, password } })
      .expect(201)
    return res.body.user as { email: string; token: string; username: string; bio: string | null; image: string | null }
  }

  it("registers a user, projects profile, and returns a token", async () => {
    const user = await registerUser("newuser", "newuser@example.com", "password123")

    expect(user).toMatchObject({
      username: "newuser",
      email: "newuser@example.com",
      bio: null,
      image: null,
    })
    expect(user.token).toEqual(expect.any(String))
    expect(user.token.length).toBeGreaterThan(0)
    expect(upsertProfileProjection).toHaveBeenCalledTimes(1)
  })

  it("logs in a user and publishes UserLoggedIn event", async () => {
    await registerUser()

    const res = await request(app.getHttpServer())
      .post("/api/users/login")
      .send({ user: { email: "test@example.com", password: "password123" } })
      .expect(200)

    expect(res.body.user.username).toBe("testuser")
    expect(res.body.user.token).toEqual(expect.any(String))

    expect(eventPublisher.count()).toBe(1)
    const [event] = eventPublisher.getEvents()
    expect(event.routingKey).toBe("user.logged_in")
    expect(event.payload).toMatchObject({
      event: "UserLoggedIn",
      data: {
        username: "testuser",
        email: "test@example.com",
      },
    })
  })

  it("gets current user with Token or Bearer header", async () => {
    const { token } = await registerUser()

    const resToken = await request(app.getHttpServer())
      .get("/api/user")
      .set("Authorization", `Token ${token}`)
      .expect(200)
    expect(resToken.body.user.email).toBe("test@example.com")

    const resBearer = await request(app.getHttpServer())
      .get("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
    expect(resBearer.body.user.username).toBe("testuser")
  })

  it("updates bio/image, normalizes empty strings to null, and preserves omitted fields", async () => {
    const { token } = await registerUser()

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { bio: "Persistent bio" } })
      .expect(200)
      .expect((res) => {
        expect(res.body.user.bio).toBe("Persistent bio")
      })

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { image: "https://example.com/photo.jpg" } })
      .expect(200)
      .expect((res) => {
        expect(res.body.user.image).toBe("https://example.com/photo.jpg")
        expect(res.body.user.bio).toBe("Persistent bio")
      })

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { bio: "", image: "" } })
      .expect(200)
      .expect((res) => {
        expect(res.body.user.bio).toBeNull()
        expect(res.body.user.image).toBeNull()
      })
  })

  it("enforces RealWorld validation and auth error contracts", async () => {
    await request(app.getHttpServer())
      .post("/api/users")
      .send({ user: { username: "", email: "a@b.com", password: "password123" } })
      .expect(422)
      .expect((res) => {
        expect(res.body.errors.username[0]).toBe("can't be blank")
      })

    await request(app.getHttpServer())
      .post("/api/users")
      .send({ user: { username: "valid", email: "", password: "password123" } })
      .expect(422)
      .expect((res) => {
        expect(res.body.errors.email[0]).toBe("can't be blank")
      })

    await request(app.getHttpServer())
      .post("/api/users")
      .send({ user: { username: "valid", email: "a@b.com", password: "" } })
      .expect(422)
      .expect((res) => {
        expect(res.body.errors.password[0]).toBe("can't be blank")
      })

    const { token } = await registerUser("dupuser", "dup@example.com", "password123")

    await request(app.getHttpServer())
      .post("/api/users")
      .send({ user: { username: "dupuser", email: "other@example.com", password: "password123" } })
      .expect(409)
      .expect((res) => {
        expect(res.body.errors.username[0]).toBe("has already been taken")
      })

    await request(app.getHttpServer())
      .post("/api/users")
      .send({ user: { username: "otheruser", email: "dup@example.com", password: "password123" } })
      .expect(409)
      .expect((res) => {
        expect(res.body.errors.email[0]).toBe("has already been taken")
      })

    await request(app.getHttpServer())
      .post("/api/users/login")
      .send({ user: { email: "dup@example.com", password: "wrongpassword" } })
      .expect(401)
      .expect((res) => {
        expect(res.body.errors.credentials[0]).toBe("invalid")
      })

    await request(app.getHttpServer())
      .get("/api/user")
      .expect(401)
      .expect((res) => {
        expect(res.body.errors.token[0]).toBe("is missing")
      })

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { email: "" } })
      .expect(422)

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { username: null } })
      .expect(422)

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { password: "short7c" } })
      .expect(422)

    await request(app.getHttpServer())
      .put("/api/user")
      .set("Authorization", `Token ${token}`)
      .send({ user: { password: "a".repeat(64) } })
      .expect(200)
  })
})
