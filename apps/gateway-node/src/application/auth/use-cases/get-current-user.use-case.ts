import { Inject, Injectable } from "@nestjs/common"
import { toUserResponse, type UserResponse } from "@/application/auth/use-cases/user-response.js"
import { JWT_GENERATOR, type JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { UserNotFoundException } from "@/domain/auth/exceptions/auth.exceptions.js"

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(JWT_GENERATOR) private readonly jwtGenerator: JwtGenerator,
  ) {}

  async execute(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new UserNotFoundException()
    }

    const token = await this.jwtGenerator.generateForUser(user)
    return toUserResponse(user, token)
  }
}
