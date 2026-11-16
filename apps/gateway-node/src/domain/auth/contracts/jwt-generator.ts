import type { User } from "@/domain/auth/entities/user.entity.js"

export const JWT_GENERATOR = Symbol("JWT_GENERATOR")

export interface JwtGenerator {
  generateForUser(user: User): Promise<string>
}
