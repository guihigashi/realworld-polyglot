import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./authSlice.ts"
import { apiSlice } from "./apiSlice.ts"
import { authListenerMiddleware } from "./authMiddleware.ts"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(authListenerMiddleware.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
