import { loginRequestSchema, registerRequestSchema, userSchema } from "./schemas.ts"
import { z } from "zod"

declare global {
  type LoginRequest = z.infer<typeof loginRequestSchema>
  type RegisterRequest = z.infer<typeof registerRequestSchema>

  type User = z.infer<typeof userSchema>

  type WrapUser<T> = { user: T }

  interface ConduitDebug {
    getToken: () => string | null
    getAuthState: () => "authenticated" | "unauthenticated" | "unavailable" | "loading"
    getCurrentUser: () => User | null
  }

  interface Window {
    __conduit_debug__: ConduitDebug
  }
}
