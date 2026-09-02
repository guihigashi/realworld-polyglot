import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://rwa-api.guihigashi.dev/api",
  }),
  tagTypes: ["CurrentUser"],
  endpoints: (build) => ({
    login: build.mutation<User, LoginRequest>({
      query: (body) => ({
        url: "/auth/users/login",
        method: "POST",
        body,
      }),
    }),
    getCurrentUser: build.query<User, string | void>({
      query: () => ({
        url: "/auth/user",
        method: "GET",
      }),
    }),
  }),
})
