import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import { JWT_TOKEN_KEY, logout } from "./authSlice.ts"
import type { RootState } from "./store.ts"
import { api } from "./api.ts"

export const authListenerMiddleware = createListenerMiddleware()

authListenerMiddleware.startListening({
  matcher: isAnyOf(
    api.endpoints.login.matchFulfilled,
    api.endpoints.register.matchFulfilled,
    api.endpoints.getCurrentUser.matchFulfilled,
    logout,
  ),
  effect: (_action, api) => {
    const auth = (api.getState() as RootState).auth

    if (auth.status === "authenticated") {
      localStorage.setItem(JWT_TOKEN_KEY, auth.user.user.token)
    } else {
      localStorage.removeItem(JWT_TOKEN_KEY)
    }
  },
})
