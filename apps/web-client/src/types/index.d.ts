import {
  articleSchema,
  articleSummarySchema,
  createArticleRequestSchema,
  loginRequestSchema,
  profileSchema,
  registerRequestSchema,
  updateUserRequestSchema,
  userSchema,
} from "./schemas.ts"
import { z } from "zod"

declare global {
  type LoginRequest = z.infer<typeof loginRequestSchema>
  type RegisterRequest = z.infer<typeof registerRequestSchema>
  type UpdateUserRequestIn = z.input<typeof updateUserRequestSchema>
  type UpdateUserRequestOut = z.output<typeof updateUserRequestSchema>

  type CreateArticleRequestIn = z.input<typeof createArticleRequestSchema>
  type CreateArticleRequestOut = z.output<typeof createArticleRequestSchema>

  type User = z.infer<typeof userSchema>
  type Profile = z.infer<typeof profileSchema>
  type Article = z.infer<typeof articleSchema>
  type ArticleSummary = z.infer<typeof articleSummarySchema>

  type WrapUser<T> = { user: T }
  type WrapProfile<T> = { profile: T }
  type WrapArticle<T> = { article: T }
  type WrapArticles<T> = {
    articles: T[]
    articlesCount: number
  }

  interface ConduitDebug {
    getToken: () => string | null
    getAuthState: () => "authenticated" | "unauthenticated" | "unavailable" | "loading"
    getCurrentUser: () => User | null
  }

  interface Window {
    __conduit_debug__: ConduitDebug
  }
}
