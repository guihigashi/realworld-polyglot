import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { RootState } from "./store.ts"

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://rwa-api.guihigashi.dev/api",
    prepareHeaders: (headers, api1) => {
      const auth = (api1.getState() as RootState).auth

      if (auth.status === "authenticated") {
        headers.set("authorization", `Token ${auth.user.user.token}`)
      }

      return headers
    },
  }),
  tagTypes: ["CurrentUser"],
  endpoints: (build) => ({
    login: build.mutation<User, LoginRequest>({
      query: (body) => ({
        url: "/users/login",
        method: "POST",
        body,
      }),
    }),
    register: build.mutation<User, RegisterRequest>({
      query: (body) => ({
        url: "/users",
        method: "POST",
        body,
      }),
    }),
    getCurrentUser: build.query<User, string | void>({
      query: (token) => ({
        url: "/user",
        method: "GET",
        headers: token ? { authorization: `Token ${token}` } : undefined,
      }),
    }),
  }),
})
