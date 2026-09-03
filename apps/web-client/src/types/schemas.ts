import { z } from "zod"

export const userSchema = z.object({
  email: z.email(),
  token: z.jwt(),
  username: z.string(),
  bio: z.string().nullable(),
  image: z.string().nullable(),
})

export const loginRequestSchema = userSchema
  .pick({
    email: true,
  })
  .extend({
    password: z.string(),
  })

export const registerRequestSchema = userSchema
  .pick({
    username: true,
    email: true,
  })
  .extend({
    password: z.string(),
  })
