import { createApi, fetchBaseQuery, type TagDescription } from "@reduxjs/toolkit/query/react"
import type { RootState } from "./store.ts"

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: (headers, api1) => {
      const auth = (api1.getState() as RootState).auth

      if (auth.status === "authenticated") {
        headers.set("authorization", `Token ${auth.user.token}`)
      }

      return headers
    },
  }),
  tagTypes: ["CurrentUser", "Comment"],
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
    listArticles: build.query<
      WrapArticles<ArticleSummary>,
      | {
          tag?: string
          author?: string
          favorited?: string
          limit?: number
          offset?: number
        }
      | undefined
    >({
      query: (params) => ({ url: "/articles", method: "GET", params }),
    }),
    feedArticles: build.query<WrapArticles<ArticleSummary>, { limit?: number; offset?: number } | undefined>({
      query: (params) => ({ url: "/articles/feed", method: "GET", params }),
    }),
    getArticle: build.query<WrapArticle<Article>, string>({
      query: (slug) => ({ url: `/articles/${slug}`, method: "GET" }),
    }),
    createArticle: build.mutation<WrapArticle<Article>, WrapArticle<CreateArticleRequestOut>>({
      query: (body) => ({ url: "/articles", method: "POST", body }),
    }),
    updateArticle: build.mutation<WrapArticle<Article>, WrapArticle<CreateArticleRequestOut> & { slug: string }>({
      query: ({ slug, ...body }) => ({ url: `/articles/${slug}`, method: "PUT", body }),
    }),
    deleteArticle: build.mutation<void, string>({
      query: (slug) => ({ url: `/articles/${slug}`, method: "DELETE" }),
    }),
    addComment: build.mutation<WrapComment<ArticleComment>, WrapComment<AddCommentRequest> & { slug: string }>({
      query: ({ slug, ...body }) => ({ url: `/articles/${slug}/comments`, method: "POST", body }),
      invalidatesTags: (_result, error, { slug }) => (error ? [] : [{ type: "Comment", id: `LIST-${slug}` }]),
    }),
    getComments: build.query<WrapComments<ArticleComment>, string>({
      query: (slug) => ({ url: `/articles/${slug}/comments`, method: "GET" }),
      providesTags: (result, _error, slug) => {
        const tags: TagDescription<"Comment">[] = [{ type: "Comment", id: `LIST-${slug}` }]

        if (result) {
          for (const c of result.comments) {
            tags.push({ type: "Comment", id: c.id })
          }
        }

        return tags
      },
    }),
    deleteComment: build.mutation<void, { slug: string; id: number }>({
      query: ({ slug, id }) => ({ url: `/articles/${slug}/comments/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, error, { id, slug }) =>
        error
          ? []
          : [
              { type: "Comment", id },
              { type: "Comment", id: `LIST-${slug}` },
            ],
    }),
    favoriteArticle: build.mutation<WrapArticle<Article>, string>({
      query: (slug) => ({ url: `/articles/${slug}/favorite`, method: "POST" }),
    }),
    unfavoriteArticle: build.mutation<WrapArticle<Article>, string>({
      query: (slug) => ({ url: `/articles/${slug}/favorite`, method: "DELETE" }),
    }),
    getTags: build.query<{ tags: string[] }, void>({
      query: () => ({ url: "/tags", method: "GET" }),
    }),
  }),
})
