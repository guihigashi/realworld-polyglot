import { z } from "zod"

const requiredString = (field: string) =>
  z
    .string({
      error: (issue) => (issue.input === undefined ? "can't be blank" : `${field} must be a string`),
    })
    .min(1, "can't be blank")

export const registerUserSchema = z.object({
  user: z.object(
    {
      username: requiredString("username").max(255),
      email: requiredString("email").pipe(z.email()).pipe(z.string().max(255)),
      password: requiredString("password").min(8),
    },
    { error: "user payload is required" },
  ),
})

export type RegisterUserDto = z.infer<typeof registerUserSchema>

export const loginUserSchema = z.object({
  user: z.object(
    {
      email: requiredString("email").pipe(z.email()),
      password: requiredString("password"),
    },
    { error: "user payload is required" },
  ),
})

export type LoginUserDto = z.infer<typeof loginUserSchema>

export const updateUserSchema = z.object({
  user: z.object(
    {
      username: z.string().min(1, "can't be blank").max(255).optional(),
      email: z.email().max(255).optional(),
      password: z.string().min(8).optional(),
      bio: z.string().nullable().optional(),
      image: z.union([z.literal(""), z.url(), z.null()]).optional(),
    },
    { error: "user payload is required" },
  ),
})

export type UpdateUserDto = z.infer<typeof updateUserSchema>
