import type { ProfileData } from "@/domain/profile/entities/profile.entity.js"

export interface ArticleSummaryData {
  slug: string
  title: string
  description: string
  tagList: string[]
  createdAt: string
  updatedAt: string
  favorited: boolean
  favoritesCount: number
  authorId: string
}

export interface ArticleData extends ArticleSummaryData {
  body: string
}

export interface HydratedArticleSummary {
  slug: string
  title: string
  description: string
  tagList: string[]
  createdAt: string
  updatedAt: string
  favorited: boolean
  favoritesCount: number
  author: ProfileData | null
}

export interface HydratedArticle extends HydratedArticleSummary {
  body: string
}

export interface CommentData {
  id: number
  createdAt: string
  updatedAt: string
  body: string
  authorId: string
}

export interface HydratedComment {
  id: number
  createdAt: string
  updatedAt: string
  body: string
  author: ProfileData | null
}

export interface CreateArticleInput {
  title: string
  description: string
  body: string
  tagList?: string[]
}

export interface UpdateArticleInput {
  title?: string
  description?: string
  body?: string
  tagList?: string[]
}

export interface FavoriteArticleResult {
  article: HydratedArticle
  favoritesVersion: number
}
