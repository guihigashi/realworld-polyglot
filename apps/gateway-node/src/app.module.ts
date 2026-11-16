import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { configurations } from "@/config/configuration.js"
import { envSchema } from "@/config/env.schema.js"
import { AppController } from "@/app.controller.js"
import { AppService } from "@/app.service.js"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
      validationSchema: envSchema,
      load: configurations,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
