import { createAsyncThunk, createSlice, isAnyOf, type PayloadAction } from "@reduxjs/toolkit"
import { api } from "./api.ts"
import type { AppDispatch } from "./store.ts"

export const JWT_TOKEN_KEY = "jwt_token"

export type AuthState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User }

const uninitialized: AuthState = { status: "loading" }

export const authSlice = createSlice({
  name: "auth",
  initialState: uninitialized as AuthState,
  reducers: {
    logout: (_state) => {
      return { status: "unauthenticated" }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyStoredToken.rejected, (_state) => {
        return { status: "unauthenticated" }
      })
      .addMatcher(
        isAnyOf(
          api.endpoints.login.matchFulfilled,
          api.endpoints.register.matchFulfilled,
          api.endpoints.getCurrentUser.matchFulfilled,
          api.endpoints.updateUser.matchFulfilled,
        ),
        (_state, action: PayloadAction<{ user: User }>) => {
          return { status: "authenticated", user: action.payload.user }
        },
      )
  },
})

export const { logout } = authSlice.actions

export default authSlice.reducer

export const verifyStoredToken = createAsyncThunk<User | null, void, { dispatch: AppDispatch }>(
  "auth/verifyStoredToken",
  async (_arg, thunkAPI) => {
    const token = localStorage.getItem(JWT_TOKEN_KEY)

    if (!token) {
      return thunkAPI.rejectWithValue(null)
    }

    try {
      const { user } = await thunkAPI.dispatch(api.endpoints.getCurrentUser.initiate(token)).unwrap()

      return user
    } catch (e) {
      console.error(e)

      localStorage.removeItem(JWT_TOKEN_KEY)

      return thunkAPI.rejectWithValue(null)
    }
  },
)

export function makeConduitDebug(auth: AuthState): ConduitDebug {
  if (auth.status === "authenticated") {
    return {
      getToken: () => auth.user.token,
      getAuthState: () => "authenticated",
      getCurrentUser: () => auth.user,
    }
  }

  return {
    getToken: () => null,
    getAuthState: () => auth.status,
    getCurrentUser: () => null,
  }
}
