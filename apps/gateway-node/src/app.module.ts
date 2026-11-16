import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { AppController } from "./app.controller.js"
import { AppService } from "./app.service.js"
import { AuthModule } from "@/auth.module.js"
import { configurations } from "@/config/configuration.js"
import { envSchema } from "@/config/env.schema.js"
import { DatabaseModule } from "@/infrastructure/database/database.module.js"
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
    DatabaseModule,
    AuthModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
