import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  bio: text("bio"),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
