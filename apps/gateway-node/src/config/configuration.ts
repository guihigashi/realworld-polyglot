import { registerAs } from "@nestjs/config"
import { decodeAppKey, envSchema } from "@/config/env.schema.js"

export const appConfig = registerAs("app", () => {
  const env = envSchema.parse(process.env)
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    requestDurationMiddleware: env.MIDDLEWARE_REQUEST_DURATION,
  }
})

export const authConfig = registerAs("auth", () => {
  const env = envSchema.parse(process.env)
  return {
    jwtSecret: decodeAppKey(env.APP_KEY),
  }
})

export const databaseConfig = registerAs("database", () => {
  const env = envSchema.parse(process.env)
  const url =
    env.DATABASE_URL ??
    `postgresql://${encodeURIComponent(env.DB_USERNAME)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT}/${encodeURIComponent(env.DB_DATABASE)}`

  return {
    url,
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_DATABASE,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
  }
})

export const grpcConfig = registerAs("grpc", () => {
  const env = envSchema.parse(process.env)
  return {
    articleServiceTarget: env.ARTICLE_SERVICE_TARGET,
    feedAggregatorTarget: env.FEED_AGGREGATOR_TARGET,
    socialGraphTarget: env.SOCIAL_GRAPH_TARGET,
  }
})

export const rabbitmqConfig = registerAs("rabbitmq", () => {
  const env = envSchema.parse(process.env)
  return {
    host: env.RABBITMQ_HOST,
    port: env.RABBITMQ_PORT,
    user: env.RABBITMQ_USER,
    password: env.RABBITMQ_PASSWORD,
    vhost: env.RABBITMQ_VHOST,
    exchange: env.RABBITMQ_EXCHANGE,
  }
})

export const configurations = [appConfig, authConfig, databaseConfig, grpcConfig, rabbitmqConfig]
