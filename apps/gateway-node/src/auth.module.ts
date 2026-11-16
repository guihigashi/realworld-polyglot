import { Module } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { join } from "node:path"
import { GetCurrentUserUseCase } from "@/application/auth/use-cases/get-current-user.use-case.js"
import { LoginUserUseCase } from "@/application/auth/use-cases/login-user.use-case.js"
import { RegisterUserUseCase } from "@/application/auth/use-cases/register-user.use-case.js"
import { UpdateUserUseCase } from "@/application/auth/use-cases/update-user.use-case.js"
import { grpcConfig } from "@/config/configuration.js"
import { JWT_DECODER } from "@/domain/auth/contracts/jwt-decoder.js"
import { JWT_GENERATOR } from "@/domain/auth/contracts/jwt-generator.js"
import { PASSWORD_HASHER } from "@/domain/auth/contracts/password-hasher.js"
import { USER_REPOSITORY } from "@/domain/auth/contracts/user.repository.js"
import { EVENT_PUBLISHER } from "@/domain/contracts/event-publisher.js"
import { SOCIAL_GRAPH_SERVICE } from "@/domain/profile/contracts/social-graph.service.js"
import { COM_GITHUB_GUIHIGASHI_CONDUIT_SOCIAL_PACKAGE_NAME } from "@/generated/grpc/social_graph.js"
import { BcryptPasswordHasher } from "@/infrastructure/auth/providers/bcrypt-password-hasher.js"
import { JoseJwtProvider } from "@/infrastructure/auth/providers/jose-jwt.provider.js"
import { DrizzleUserRepository } from "@/infrastructure/auth/repositories/drizzle-user.repository.js"
import { RabbitMqEventPublisher } from "@/infrastructure/messaging/rabbitmq-event-publisher.js"
import { GrpcSocialGraphService, SOCIAL_GRAPH_GRPC_CLIENT } from "@/infrastructure/profile/grpc-social-graph.service.js"
import { AuthController } from "@/presentation/http/controllers/auth.controller.js"
import { UserController } from "@/presentation/http/controllers/user.controller.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"
import { OptionalJwtAuthGuard } from "@/presentation/http/guards/optional-jwt-auth.guard.js"

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SOCIAL_GRAPH_GRPC_CLIENT,
        inject: [grpcConfig.KEY],
        useFactory: (grpcCfg: ConfigType<typeof grpcConfig>) => ({
          transport: Transport.GRPC,
          options: {
            url: grpcCfg.socialGraphTarget,
            package: COM_GITHUB_GUIHIGASHI_CONDUIT_SOCIAL_PACKAGE_NAME,
            protoPath: join(import.meta.dirname, "proto/social_graph.proto"),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController, UserController],
  providers: [
    JoseJwtProvider,
    BcryptPasswordHasher,
    DrizzleUserRepository,
    RabbitMqEventPublisher,
    GrpcSocialGraphService,
    { provide: JWT_GENERATOR, useExisting: JoseJwtProvider },
    { provide: JWT_DECODER, useExisting: JoseJwtProvider },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher },
    { provide: USER_REPOSITORY, useExisting: DrizzleUserRepository },
    { provide: EVENT_PUBLISHER, useExisting: RabbitMqEventPublisher },
    { provide: SOCIAL_GRAPH_SERVICE, useExisting: GrpcSocialGraphService },
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
