import { configureStore } from "@reduxjs/toolkit"
import authReducer from "@/state/authSlice.ts"
import { api } from "@/state/api.ts"
import { authListenerMiddleware } from "@/state/authMiddleware.ts"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authListenerMiddleware.middleware, api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
