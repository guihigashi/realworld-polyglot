import { ConfigModule, ConfigService, type ConfigType } from "@nestjs/config"
import { Test } from "@nestjs/testing"
import {
  appConfig,
  authConfig,
  configurations,
  databaseConfig,
  grpcConfig,
  rabbitmqConfig,
} from "@/config/configuration.js"
import { decodeAppKey, envSchema } from "@/config/env.schema.js"

describe("@nestjs/config integration", () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key]
      }
    }
    Object.assign(process.env, originalEnv)
  })

  it("loads defaults and namespaced configs via ConfigModule.forRoot", async () => {
    process.env.APP_KEY = "plain-secret"

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validationSchema: envSchema,
          load: configurations,
        }),
      ],
    }).compile()

    const configService = moduleRef.get(ConfigService)
    const appCfg = moduleRef.get<ConfigType<typeof appConfig>>(appConfig.KEY)
    const authCfg = moduleRef.get<ConfigType<typeof authConfig>>(authConfig.KEY)
    const dbCfg = moduleRef.get<ConfigType<typeof databaseConfig>>(databaseConfig.KEY)
    const grpcCfg = moduleRef.get<ConfigType<typeof grpcConfig>>(grpcConfig.KEY)
    const rmqCfg = moduleRef.get<ConfigType<typeof rabbitmqConfig>>(rabbitmqConfig.KEY)

    expect(configService.get<number>("app.port")).toBe(3000)
    expect(appCfg).toEqual({
      env: "test",
      port: 3000,
      logLevel: "debug",
      corsAllowedOrigins: ["*"],
      requestDurationMiddleware: false,
    })
    expect(authCfg.jwtSecret).toEqual(Buffer.from("plain-secret", "utf8"))
    expect(dbCfg.url).toBe("postgresql://realworld:secret@127.0.0.1:5432/realworld")
    expect(grpcCfg).toEqual({
      articleServiceTarget: "127.0.0.1:9092",
      feedAggregatorTarget: "127.0.0.1:9091",
      socialGraphTarget: "127.0.0.1:9090",
    })
    expect(rmqCfg).toEqual({
      host: "127.0.0.1",
      port: 5672,
      user: "user",
      password: "secret",
      vhost: "rwa",
      exchange: "events",
    })
  })

  it("decodes base64:-prefixed APP_KEY values", () => {
    const raw = "base64:cZnVVujUapknriqXT+/wCRfEKVWHfi30OTmlhW1qsV4="
    expect(decodeAppKey(raw)).toEqual(Buffer.from("cZnVVujUapknriqXT+/wCRfEKVWHfi30OTmlhW1qsV4=", "base64"))
  })

  it("prefers explicit DATABASE_URL and parses cors origins & stringbool", async () => {
    process.env.APP_KEY = "secret"
    process.env.PORT = "8000"
    process.env.CORS_ALLOWED_ORIGINS = "http://localhost:5173, https://rwa.guihigashi.dev"
    process.env.MIDDLEWARE_REQUEST_DURATION = "true"
    process.env.DATABASE_URL = "postgresql://custom:pass@db:5432/app"

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validationSchema: envSchema,
          load: configurations,
        }),
      ],
    }).compile()

    const appCfg = moduleRef.get<ConfigType<typeof appConfig>>(appConfig.KEY)
    const dbCfg = moduleRef.get<ConfigType<typeof databaseConfig>>(databaseConfig.KEY)

    expect(appCfg.port).toBe(8000)
    expect(appCfg.corsAllowedOrigins).toEqual(["http://localhost:5173", "https://rwa.guihigashi.dev"])
    expect(appCfg.requestDurationMiddleware).toBe(true)
    expect(dbCfg.url).toBe("postgresql://custom:pass@db:5432/app")
  })

  it("rejects startup when APP_KEY is missing or PORT is invalid", async () => {
    delete process.env.APP_KEY
    process.env.PORT = "not-a-port"

    await expect(
      Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            validationSchema: envSchema,
            load: configurations,
          }),
        ],
      }).compile(),
    ).rejects.toThrow(/Config validation error/)
  })
})
