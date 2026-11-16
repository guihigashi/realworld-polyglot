import { Inject, type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"
import { ConfigModule, type ConfigType } from "@nestjs/config"
import { ServeStaticModule } from "@nestjs/serve-static"
import { join } from "node:path"
import { ArticleModule } from "@/article.module.js"
import { AuthModule } from "@/auth.module.js"
import { appConfig, configurations } from "@/config/configuration.js"
import { envSchema } from "@/config/env.schema.js"
import { FeedModule } from "@/feed.module.js"
import { DatabaseModule } from "@/infrastructure/database/database.module.js"
import { RequestDurationMiddleware } from "@/presentation/http/middleware/request-duration.middleware.js"
import { ProfileModule } from "@/profile.module.js"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
      validationSchema: envSchema,
      load: configurations,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(import.meta.dirname, "..", "public", "dist"),
      exclude: /^\/api(?:\/|$)/,
    }),
    DatabaseModule,
    AuthModule,
    ProfileModule,
    FeedModule,
    ArticleModule,
  ],
})
export class AppModule implements NestModule {
  constructor(
    @Inject(appConfig.KEY)
    private readonly cfg: ConfigType<typeof appConfig>,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    if (this.cfg.requestDurationMiddleware) {
      consumer.apply(RequestDurationMiddleware).forRoutes("*")
    }
  }
}
