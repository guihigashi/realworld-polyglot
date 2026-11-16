import { Injectable } from "@nestjs/common"
import bcrypt from "bcryptjs"
import type { PasswordHasher } from "@/domain/auth/contracts/password-hasher.js"

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private static readonly SALT_ROUNDS = 12

  async verify(plainPassword: string, hashedPassword: string): Promise<boolean> {
    // Laravel emits $2y$ prefixes; bcryptjs expects $2a$/$2b$.
    const normalizedHash = hashedPassword.startsWith("$2y$") ? `$2b$${hashedPassword.slice(4)}` : hashedPassword
    return bcrypt.compare(plainPassword, normalizedHash)
  }

  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, BcryptPasswordHasher.SALT_ROUNDS)
  }
}
