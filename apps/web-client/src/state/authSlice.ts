import { createAsyncThunk, createSlice, isAnyOf, type PayloadAction } from "@reduxjs/toolkit"
import { api } from "./api.ts"
import type { AppDispatch } from "./store.ts"

export const JWT_TOKEN_KEY = "jwt_token"

export type AuthState =
  | { status: "uninitialized" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User }

const uninitialized: AuthState = { status: "uninitialized" }

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
        ),
        (_state, action: PayloadAction<User>) => {
          return { status: "authenticated", user: action.payload }
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
      return await thunkAPI.dispatch(api.endpoints.getCurrentUser.initiate(token)).unwrap()
    } catch (e) {
      console.error(e)

      localStorage.removeItem(JWT_TOKEN_KEY)

      return thunkAPI.rejectWithValue(null)
    }
  },
)
