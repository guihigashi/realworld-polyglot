import { Test, TestingModule } from "@nestjs/testing"
import request from "supertest"
import { AppModule } from "@/app.module.js"
import { NestNodeApplication, NodeAdapter } from "@nestjs/platform-node"

describe("AppController (e2e)", () => {
  let app: NestNodeApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestNodeApplication>(new NodeAdapter())
    await app.init()
  })

  it("/ (GET)", () => {
    return request(app.getHttpServer()).get("/").expect(200).expect("Hello World!")
  })

  afterEach(async () => {
    await app.close()
  })
})
