import { defineConfig } from "drizzle-kit"

const host = process.env.DB_HOST ?? "127.0.0.1"
const port = process.env.DB_PORT ?? "5432"
const database = process.env.DB_DATABASE ?? "realworld"
const user = process.env.DB_USERNAME ?? "realworld"
const password = process.env.DB_PASSWORD ?? "secret"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`,
  },
})
