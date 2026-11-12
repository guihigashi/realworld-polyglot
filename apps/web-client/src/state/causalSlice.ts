import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { logout } from "@/state/authSlice.ts"

export interface CausalState {
  followsVersion: string | null
  favoritesVersion: string | null
}

const initialState: CausalState = {
  followsVersion: null,
  favoritesVersion: null,
}

export const causalSlice = createSlice({
  name: "causal",
  initialState,
  reducers: {
    setFollowsVersion: (state, action: PayloadAction<string>) => {
      state.followsVersion = action.payload
    },
    setFavoritesVersion: (state, action: PayloadAction<string>) => {
      state.favoritesVersion = action.payload
    },
    resetCausalVersions: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState)
  },
})

export const { setFollowsVersion, setFavoritesVersion, resetCausalVersions } = causalSlice.actions
export default causalSlice.reducer
