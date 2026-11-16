import { Inject, Injectable } from "@nestjs/common"
import { toUserResponse, type UserResponse } from "@/application/auth/use-cases/user-response.js"
import { JWT_GENERATOR, type JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import { PASSWORD_HASHER, type PasswordHasher } from "@/domain/auth/contracts/password-hasher.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { UserLoggedInEvent } from "@/domain/auth/events/user-logged-in.event.js"
import { InvalidCredentialsException } from "@/domain/auth/exceptions/auth.exceptions.js"
import { EVENT_PUBLISHER, type EventPublisher } from "@/domain/contracts/event-publisher.js"

export interface LoginUserInput {
  email: string
  password: string
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(JWT_GENERATOR) private readonly jwtGenerator: JwtGenerator,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: LoginUserInput): Promise<UserResponse> {
    const user = await this.userRepository.findByEmail(input.email)
    if (!user) {
      throw new InvalidCredentialsException()
    }

    const valid = await this.passwordHasher.verify(input.password, user.getPasswordHash())
    if (!valid) {
      throw new InvalidCredentialsException()
    }

    const token = await this.jwtGenerator.generateForUser(user)

    const event = new UserLoggedInEvent(user)
    await this.eventPublisher.publish(event.eventName(), event.toPayload())

    return toUserResponse(user, token)
  }
}
