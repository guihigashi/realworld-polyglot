import { z } from "zod"

const passwordSchema = z.string().min(8).max(255)

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
    password: passwordSchema,
  })

export const registerRequestSchema = userSchema
  .pick({
    username: true,
    email: true,
  })
  .extend({
    password: passwordSchema,
  })

export const updateUserRequestSchema = z
  .object({
    image: z.url(),
    email: z.email(),
    username: z.string(),
    bio: z.string(),
    password: passwordSchema,
  })
  .partial()

export const profileSchema = userSchema
  .omit({
    email: true,
    token: true,
  })
  .extend({
    following: z.boolean(),
  })

export const articleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  body: z.string(),
  tagList: z.string().array(),
  createdAt: z.string(),
  updatedAt: z.string(),
  favorited: z.boolean(),
  favoritesCount: z.number(),
  author: profileSchema,
})

export const articleSummarySchema = articleSchema.omit({
  body: true,
})

export const createArticleRequestSchema = articleSchema
  .pick({
    title: true,
    description: true,
    body: true,
  })
  .extend({
    tagList: z
      .object({ value: z.string() })
      .array()
      .optional()
      .transform((value) => value?.map(({ value }) => value)),
  })

export const commentSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  body: z.string(),
  author: profileSchema,
})

export const addCommentRequestSchema = commentSchema.pick({
  body: true,
})
