import { ConfigService } from "@nestjs/config"
import { NestFactory } from "@nestjs/core"
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node"
import { AppModule } from "@/app.module.js"

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter())
  const configService = app.get(ConfigService)
  await app.listen(configService.getOrThrow<number>("app.port"))
}
await bootstrap()
