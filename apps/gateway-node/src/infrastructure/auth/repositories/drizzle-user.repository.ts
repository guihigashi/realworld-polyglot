import { Inject, Injectable } from "@nestjs/common"
import { InjectDrizzle } from "@nestjs/drizzle"
import { eq } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type { UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { DuplicateUserFieldException } from "@/domain/auth/exceptions/auth.exceptions.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { type UserRow, users } from "@/infrastructure/database/schema.js"

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
    @Inject(SOCIAL_GRAPH_SERVICE)
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ? this.toDomain(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    return row ? this.toDomain(row) : null
  }

  async findByUsername(username: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.username, username)).limit(1)
    return row ? this.toDomain(row) : null
  }

  async save(user: User): Promise<void> {
    const now = new Date()

    try {
      await this.db
        .insert(users)
        .values({
          id: user.getId(),
          username: user.getUsername(),
          email: user.getEmail(),
          password: user.getPasswordHash(),
          bio: user.getBio(),
          image: user.getImage(),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            username: user.getUsername(),
            email: user.getEmail(),
            password: user.getPasswordHash(),
            bio: user.getBio(),
            image: user.getImage(),
            updatedAt: now,
          },
        })
    } catch (error) {
      const uniqueField = extractUniqueViolationField(error)
      if (uniqueField) {
        throw new DuplicateUserFieldException(uniqueField)
      }
      throw error
    }

    await this.socialGraphService.upsertProfileProjection(user)
  }

  private toDomain(row: UserRow): User {
    return new User({
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password,
      bio: row.bio,
      image: row.image,
    })
  }
}

function extractUniqueViolationField(error: unknown): "username" | "email" | null {
  if (typeof error !== "object" || error === null) {
    return null
  }
  const pgErr = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } }
  const code = pgErr.code ?? pgErr.cause?.code
  const constraint = pgErr.constraint ?? pgErr.cause?.constraint ?? ""

  if (code !== "23505") {
    return null
  }
  if (constraint.includes("username")) {
    return "username"
  }
  if (constraint.includes("email")) {
    return "email"
  }
  return null
}
