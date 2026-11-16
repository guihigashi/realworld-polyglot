import { Module } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node"
import { ServeStaticModule } from "@nestjs/serve-static"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import request from "supertest"
import { AppModule } from "@/app.module.js"

describe("App SPA serving (e2e)", () => {
  let app: NestNodeApplication

  it("returns 404 on / when public/dist is not built", async () => {
    app = await NestFactory.create<NestNodeApplication>(AppModule, new NodeAdapter(), {
      logger: false,
    })
    app.setGlobalPrefix("api")
    await app.init()

    await request(app.getHttpServer()).get("/").expect(404)
  })

  it("serves SPA static assets and falls back to index.html for non-/api routes", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "gateway-node-spa-"))
    try {
      mkdirSync(join(tempDir, "assets"), { recursive: true })
      writeFileSync(join(tempDir, "index.html"), "<!doctype html><html><body>Conduit SPA</body></html>")
      writeFileSync(join(tempDir, "assets", "app.js"), "console.log('conduit');")

      @Module({
        imports: [
          ServeStaticModule.forRoot({
            rootPath: tempDir,
            exclude: /^\/api(?:\/|$)/,
          }),
        ],
      })
      class SpaTestModule {}

      app = await NestFactory.create<NestNodeApplication>(SpaTestModule, new NodeAdapter(), {
        logger: false,
      })
      app.setGlobalPrefix("api")
      await app.init()

      await request(app.getHttpServer())
        .get("/")
        .expect(200)
        .expect("Content-Type", /text\/html/)
        .expect(/Conduit SPA/)

      await request(app.getHttpServer())
        .get("/assets/app.js")
        .expect(200)
        .expect("Content-Type", /javascript/)
        .expect("console.log('conduit');")

      await request(app.getHttpServer())
        .get("/article/how-to-train-your-dragon?tab=comments")
        .expect(200)
        .expect("Content-Type", /text\/html/)
        .expect(/Conduit SPA/)

      await request(app.getHttpServer()).get("/api/does-not-exist").expect(404)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  afterEach(async () => {
    await app?.close()
  })
})
