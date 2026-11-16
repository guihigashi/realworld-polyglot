import type { User } from "@/domain/auth/entities/user.entity.js"

export const USER_REPOSITORY = Symbol("USER_REPOSITORY")

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  save(user: User): Promise<void>
}
