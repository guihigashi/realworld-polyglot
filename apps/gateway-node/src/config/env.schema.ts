import { z } from "zod"

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
  CORS_ALLOWED_ORIGINS: z.string().default("*"),
  MIDDLEWARE_REQUEST_DURATION: z.stringbool().default(false),

  APP_KEY: z.string().min(1, "APP_KEY is required"),

  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().min(1).default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_DATABASE: z.string().min(1).default("realworld"),
  DB_USERNAME: z.string().min(1).default("realworld"),
  DB_PASSWORD: z.string().default("secret"),

  ARTICLE_SERVICE_TARGET: z.string().min(1).default("127.0.0.1:9092"),
  FEED_AGGREGATOR_TARGET: z.string().min(1).default("127.0.0.1:9091"),
  SOCIAL_GRAPH_TARGET: z.string().min(1).default("127.0.0.1:9090"),

  RABBITMQ_HOST: z.string().min(1).default("127.0.0.1"),
  RABBITMQ_PORT: z.coerce.number().int().min(1).max(65535).default(5672),
  RABBITMQ_USER: z.string().min(1).default("user"),
  RABBITMQ_PASSWORD: z.string().default("secret"),
  RABBITMQ_VHOST: z.string().min(1).default("rwa"),
  RABBITMQ_EXCHANGE: z.string().min(1).default("events"),
})

export type EnvVariables = z.infer<typeof envSchema>

export function decodeAppKey(rawKey: string): Buffer {
  if (rawKey.startsWith("base64:")) {
    const decoded = Buffer.from(rawKey.slice(7), "base64")
    if (decoded.length > 0) {
      return decoded
    }
  }
  return Buffer.from(rawKey, "utf8")
}
