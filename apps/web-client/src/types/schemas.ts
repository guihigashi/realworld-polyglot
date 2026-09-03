import { z } from "zod"

const baseUser = z.object({
  email: z.email(),
  token: z.jwt(),
  username: z.string(),
  bio: z.string().nullable(),
  image: z.string().nullable(),
})

export const userSchema = z.object({
  user: baseUser,
})

export const loginRequestSchema = z.object({
  user: baseUser
    .pick({
      email: true,
    })
    .extend({
      password: z.string(),
    }),
})

export const registerRequestSchema = z.object({
  user: baseUser
    .pick({
      username: true,
      email: true,
    })
    .extend({
      password: z.string(),
    }),
})
