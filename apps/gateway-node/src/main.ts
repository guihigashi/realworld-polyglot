import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module.js"
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node"

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter())
  await app.listen(process.env.PORT ?? 3000)
}
await bootstrap()
