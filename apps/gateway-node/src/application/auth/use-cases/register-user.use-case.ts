import { Inject, Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { toUserResponse, type UserResponse } from "@/application/auth/use-cases/user-response.js"
import { JWT_GENERATOR, type JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import { PASSWORD_HASHER, type PasswordHasher } from "@/domain/auth/contracts/password-hasher.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { DuplicateUserFieldException } from "@/domain/auth/exceptions/auth.exceptions.js"

export interface RegisterUserInput {
  username: string
  email: string
  password: string
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(JWT_GENERATOR) private readonly jwtGenerator: JwtGenerator,
  ) {}

  async execute(input: RegisterUserInput): Promise<UserResponse> {
    if (await this.userRepository.findByUsername(input.username)) {
      throw new DuplicateUserFieldException("username")
    }
    if (await this.userRepository.findByEmail(input.email)) {
      throw new DuplicateUserFieldException("email")
    }

    const passwordHash = await this.passwordHasher.hash(input.password)
    const user = new User({
      id: randomUUID(),
      username: input.username,
      email: input.email,
      passwordHash,
    })

    await this.userRepository.save(user)

    const token = await this.jwtGenerator.generateForUser(user)
    return toUserResponse(user, token)
  }
}
