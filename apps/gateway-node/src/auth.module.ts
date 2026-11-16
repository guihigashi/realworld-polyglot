import { Module } from "@nestjs/common"
import { GetCurrentUserUseCase } from "@/application/auth/use-cases/get-current-user.use-case.js"
import { LoginUserUseCase } from "@/application/auth/use-cases/login-user.use-case.js"
import { RegisterUserUseCase } from "@/application/auth/use-cases/register-user.use-case.js"
import { UpdateUserUseCase } from "@/application/auth/use-cases/update-user.use-case.js"
import { JWT_DECODER } from "@/domain/auth/contracts/jwt-decoder.js"
import { JWT_GENERATOR } from "@/domain/auth/contracts/jwt-generator.js"
import { PASSWORD_HASHER } from "@/domain/auth/contracts/password-hasher.js"
import { USER_REPOSITORY } from "@/domain/auth/contracts/user.repository.js"
import { EVENT_PUBLISHER } from "@/domain/contracts/event-publisher.js"
import { BcryptPasswordHasher } from "@/infrastructure/auth/providers/bcrypt-password-hasher.js"
import { JoseJwtProvider } from "@/infrastructure/auth/providers/jose-jwt.provider.js"
import { DrizzleUserRepository } from "@/infrastructure/auth/repositories/drizzle-user.repository.js"
import { RabbitMqEventPublisher } from "@/infrastructure/messaging/rabbitmq-event-publisher.js"
import { SocialGraphModule } from "@/infrastructure/profile/social-graph.module.js"
import { AuthController } from "@/presentation/http/controllers/auth.controller.js"
import { UserController } from "@/presentation/http/controllers/user.controller.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"
import { OptionalJwtAuthGuard } from "@/presentation/http/guards/optional-jwt-auth.guard.js"

@Module({
  imports: [SocialGraphModule],
  controllers: [AuthController, UserController],
  providers: [
    JoseJwtProvider,
    BcryptPasswordHasher,
    DrizzleUserRepository,
    RabbitMqEventPublisher,
    { provide: JWT_GENERATOR, useExisting: JoseJwtProvider },
    { provide: JWT_DECODER, useExisting: JoseJwtProvider },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher },
    { provide: USER_REPOSITORY, useExisting: DrizzleUserRepository },
    { provide: EVENT_PUBLISHER, useExisting: RabbitMqEventPublisher },
    RegisterUserUseCase,
    LoginUserUseCase,
    GetCurrentUserUseCase,
    UpdateUserUseCase,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [JWT_DECODER, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class AuthModule {}
