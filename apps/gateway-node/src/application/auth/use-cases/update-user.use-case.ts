import { Inject, Injectable } from "@nestjs/common"
import { toUserResponse, type UserResponse } from "@/application/auth/use-cases/user-response.js"
import { JWT_GENERATOR, type JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import { PASSWORD_HASHER, type PasswordHasher } from "@/domain/auth/contracts/password-hasher.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { DuplicateUserFieldException, UserNotFoundException } from "@/domain/auth/exceptions/auth.exceptions.js"

export interface UpdateUserInput {
  username?: string
  email?: string
  password?: string
  bio?: string | null
  image?: string | null
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(JWT_GENERATOR) private readonly jwtGenerator: JwtGenerator,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(userId: string, data?: UpdateUserInput): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new UserNotFoundException()
    }

    if (data !== undefined) {
      if (data.username !== undefined && data.username !== user.getUsername()) {
        const existing = await this.userRepository.findByUsername(data.username)
        if (existing && existing.getId() !== user.getId()) {
          throw new DuplicateUserFieldException("username")
        }
        user.changeUsername(data.username)
      }

      if (data.email !== undefined && data.email !== user.getEmail()) {
        const existing = await this.userRepository.findByEmail(data.email)
        if (existing && existing.getId() !== user.getId()) {
          throw new DuplicateUserFieldException("email")
        }
        user.changeEmail(data.email)
      }

      if (data.password !== undefined) {
        const hashed = await this.passwordHasher.hash(data.password)
        user.changePassword(hashed)
      }

      if (data.bio !== undefined) {
        user.changeBio(data.bio)
      }

      if (data.image !== undefined) {
        user.changeImage(data.image)
      }

      await this.userRepository.save(user)
    }

    const token = await this.jwtGenerator.generateForUser(user)
    return toUserResponse(user, token)
  }
}
