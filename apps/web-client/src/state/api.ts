import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import type { RootState } from "./store.ts"

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://rwa-api.guihigashi.dev/api",
    prepareHeaders: (headers, api1) => {
      const auth = (api1.getState() as RootState).auth

      if (auth.status === "authenticated") {
        headers.set("authorization", `Token ${auth.user.token}`)
      }

      return headers
    },
  }),
  tagTypes: ["CurrentUser"],
  endpoints: (build) => ({
    login: build.mutation<WrapUser<User>, WrapUser<LoginRequest>>({
      query: (body) => ({ url: "/users/login", method: "POST", body }),
    }),
    register: build.mutation<WrapUser<User>, WrapUser<RegisterRequest>>({
      query: (body) => ({ url: "/users", method: "POST", body }),
    }),
    getCurrentUser: build.query<WrapUser<User>, string | void>({
      query: (token) => ({
        url: "/user",
        method: "GET",
        headers: token ? { authorization: `Token ${token}` } : undefined,
      }),
    }),
    updateUser: build.mutation<WrapUser<User>, WrapUser<UpdateUserRequestOut>>({
      query: (body) => ({ url: "/user", method: "PUT", body }),
    }),
    getProfile: build.query<WrapProfile<Profile>, string>({
      query: (username) => ({ url: `/profiles/${username}`, method: "GET" }),
    }),
  }),
})
