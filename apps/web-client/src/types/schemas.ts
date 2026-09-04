import { z } from "zod"
import { removeEmptyValues } from "../utils/object.ts"

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

export const updateUserRequestSchema = userSchema
  .omit({
    token: true,
  })
  .extend({
    password: z.string(),
  })
  .transform(removeEmptyValues)

export const profileSchema = userSchema
  .omit({
    email: true,
    token: true,
  })
  .extend({
    following: z.boolean(),
  })
