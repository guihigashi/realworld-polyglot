import {
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

  type User = z.infer<typeof userSchema>
  type Profile = z.infer<typeof profileSchema>

  type WrapUser<T> = { user: T }
  type WrapProfile<T> = { profile: T }

  interface ConduitDebug {
    getToken: () => string | null
    getAuthState: () => "authenticated" | "unauthenticated" | "unavailable" | "loading"
    getCurrentUser: () => User | null
  }

  interface Window {
    __conduit_debug__: ConduitDebug
  }
}
