import { describe, expect, it, vi } from "vitest"
import { LoginUserUseCase } from "@/application/auth/use-cases/login-user.use-case.js"
import type { JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import type { PasswordHasher } from "@/domain/auth/contracts/password-hasher.js"
import type { UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { InvalidCredentialsException } from "@/domain/auth/exceptions/auth.exceptions.js"
import { InMemoryEventPublisher } from "@/infrastructure/messaging/in-memory-event-publisher.js"

describe("LoginUserUseCase", () => {
  it("dispatches user.logged_in event upon successful authentication", async () => {
    const user = new User({
      id: "usr-123",
      username: "johndoe",
      email: "john@example.com",
      passwordHash: "hashed_pw",
      bio: "Hello world",
      image: "https://example.com/avatar.jpg",
    })

    const userRepository: UserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(user),
      findByUsername: vi.fn(),
      save: vi.fn(),
    }
    const passwordHasher: PasswordHasher = {
      verify: vi.fn().mockResolvedValue(true),
      hash: vi.fn(),
    }
    const jwtGenerator: JwtGenerator = {
      generateForUser: vi.fn().mockResolvedValue("sample-jwt-token"),
    }
    const eventPublisher = new InMemoryEventPublisher()

    const useCase = new LoginUserUseCase(userRepository, passwordHasher, jwtGenerator, eventPublisher)
    const result = await useCase.execute({ email: "john@example.com", password: "secret123" })

    expect(result).toEqual({
      email: "john@example.com",
      token: "sample-jwt-token",
      username: "johndoe",
      bio: "Hello world",
      image: "https://example.com/avatar.jpg",
    })

    expect(eventPublisher.count()).toBe(1)
    const published = eventPublisher.getEvents()[0]
    expect(published.routingKey).toBe("user.logged_in")
    expect(published.payload).toMatchObject({
      event: "UserLoggedIn",
      data: {
        user_id: "usr-123",
        email: "john@example.com",
        username: "johndoe",
      },
    })
    expect((published.payload as { occurred_at: string }).occurred_at).toEqual(expect.any(String))
  })

  it("does not dispatch event when user is not found", async () => {
    const userRepository: UserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn(),
      save: vi.fn(),
    }
    const passwordHasher: PasswordHasher = {
      verify: vi.fn(),
      hash: vi.fn(),
    }
    const jwtGenerator: JwtGenerator = {
      generateForUser: vi.fn(),
    }
    const eventPublisher = new InMemoryEventPublisher()

    const useCase = new LoginUserUseCase(userRepository, passwordHasher, jwtGenerator, eventPublisher)

    await expect(useCase.execute({ email: "unknown@example.com", password: "secret123" })).rejects.toThrow(
      InvalidCredentialsException,
    )
    expect(eventPublisher.count()).toBe(0)
  })

  it("does not dispatch event when password verification fails", async () => {
    const user = new User({
      id: "usr-123",
      username: "johndoe",
      email: "john@example.com",
      passwordHash: "hashed_pw",
    })

    const userRepository: UserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(user),
      findByUsername: vi.fn(),
      save: vi.fn(),
    }
    const passwordHasher: PasswordHasher = {
      verify: vi.fn().mockResolvedValue(false),
      hash: vi.fn(),
    }
    const jwtGenerator: JwtGenerator = {
      generateForUser: vi.fn(),
    }
    const eventPublisher = new InMemoryEventPublisher()

    const useCase = new LoginUserUseCase(userRepository, passwordHasher, jwtGenerator, eventPublisher)

    await expect(useCase.execute({ email: "john@example.com", password: "wrong_pw" })).rejects.toThrow(
      InvalidCredentialsException,
    )
    expect(eventPublisher.count()).toBe(0)
  })
})
