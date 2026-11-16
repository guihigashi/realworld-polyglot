import { z } from "zod"

const requiredString = (field: string) =>
  z
    .string({
      error: (issue) => (issue.input === undefined ? "can't be blank" : `${field} must be a string`),
    })
    .min(1, "can't be blank")

export const createArticleSchema = z.object({
  article: z.object(
    {
      title: requiredString("title"),
      description: requiredString("description"),
      body: requiredString("body"),
      tagList: z
        .array(z.string())
        .nullable()
        .optional()
        .transform((tags) => tags ?? []),
    },
    { error: "article payload is required" },
  ),
})

export type CreateArticleDto = z.infer<typeof createArticleSchema>

export const updateArticleSchema = z.object({
  article: z.object(
    {
      title: z.string().min(1, "can't be blank").optional(),
      description: z.string().min(1, "can't be blank").optional(),
      body: z.string().min(1, "can't be blank").optional(),
      tagList: z.array(z.string()).optional(),
    },
    { error: "article payload is required" },
  ),
})

export type UpdateArticleDto = z.infer<typeof updateArticleSchema>

export const addCommentSchema = z.object({
  comment: z.object(
    {
      body: requiredString("body"),
    },
    { error: "comment payload is required" },
  ),
})

export type AddCommentDto = z.infer<typeof addCommentSchema>

export function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") {
    return fallback
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function parseOptionalVersionHeader(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") {
    return null
  }
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}
