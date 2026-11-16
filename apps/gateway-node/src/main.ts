import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node"
import { AppModule } from "@/app.module.js"
import { NODE_ADAPTER_OPTIONS } from "@/presentation/http/node-adapter.options.js"

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter(NODE_ADAPTER_OPTIONS))
  const configService = app.get(ConfigService)

  app.setGlobalPrefix("api")

  const corsOrigins = configService.get<string[]>("app.corsAllowedOrigins") ?? ["*"]
  app.enableCors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
    exposedHeaders: ["X-Follows-Version", "X-Favorites-Version"],
  })

  await app.listen(configService.getOrThrow<number>("app.port"))
}
await bootstrap()
