import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { apiSlice } from "./apiSlice.ts"
import type { AppDispatch } from "./store.ts"

export interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isInitialized: boolean
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true
      state.token = action.payload
    },
    logout: (state) => {
      state.token = null
      state.user = null
      state.isAuthenticated = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyStoredToken.fulfilled, (state, action) => {
        if (action.payload !== null) {
          state.token = action.payload.token
          state.user = action.payload.user
          state.isAuthenticated = true
        } else {
          state.token = null
          state.user = null
          state.isAuthenticated = false
        }
        state.isInitialized = true
      })
      .addCase(verifyStoredToken.rejected, (state) => {
        state.token = null
        state.user = null
        state.isAuthenticated = false
        state.isInitialized = true
      })
  },
})

export const { login, logout } = authSlice.actions

export default authSlice.reducer

export const verifyStoredToken = createAsyncThunk<
  { token: string; user: User } | null,
  void,
  { dispatch: AppDispatch }
>("auth/verifyStoredSession", async (_arg, thunkAPI) => {
  const token = localStorage.getItem("jwt_token")
  if (!token) {
    return null
  }

  try {
    const user = await thunkAPI.dispatch(apiSlice.endpoints.getCurrentUser.initiate(token)).unwrap()

    return { token, user }
  } catch (e) {
    console.error(e)
    localStorage.removeItem("jwt_token")

    return thunkAPI.rejectWithValue(null)
  }
})
