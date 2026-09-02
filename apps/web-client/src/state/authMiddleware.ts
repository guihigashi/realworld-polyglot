import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import { login, logout } from "./authSlice.ts"
import type { RootState } from "./store.ts"

export const authListenerMiddleware = createListenerMiddleware()

authListenerMiddleware.startListening({
  matcher: isAnyOf(login, logout),
  effect: (_action, api) => {
    const token = (api.getState() as RootState).auth.token

    if (token) {
      localStorage.setItem("jwt_token", token)
    } else {
      localStorage.removeItem("jwt_token")
    }
  },
})
