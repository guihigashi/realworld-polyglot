import { RequestMethod } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node"
import { AppModule } from "@/app.module.js"

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter())
  const configService = app.get(ConfigService)

  app.setGlobalPrefix("api", {
    exclude: [{ path: "", method: RequestMethod.GET }],
  })

  const corsOrigins = configService.get<string[]>("app.corsAllowedOrigins") ?? ["*"]
  app.enableCors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
  })

  await app.listen(configService.getOrThrow<number>("app.port"))
}
await bootstrap()
