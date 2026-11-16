import type {
  HydratedArticle,
  HydratedArticleSummary,
  HydratedComment,
} from "@/domain/article/entities/article.types.js"

export const FEED_SERVICE = Symbol("FEED_SERVICE")

export interface GetFeedParams {
  limit: number
  offset: number
  requestorId: string
  minFollowsVersion?: number | null
  minFavoritesVersion?: number | null
}

export interface ListFeedArticlesParams {
  tag?: string | null
  author?: string | null
  favorited?: string | null
  limit: number
  offset: number
  requestorId?: string | null
  minFavoritesVersion?: number | null
}

export interface GetFeedArticleParams {
  slug: string
  requestorId?: string | null
  minFavoritesVersion?: number | null
  minFollowsVersion?: number | null
}

export interface GetFeedCommentsParams {
  slug: string
  requestorId?: string | null
  minFollowsVersion?: number | null
}

export interface FeedService {
  getFeed(params: GetFeedParams): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }>
  getTags(): Promise<string[]>
  listArticles(params: ListFeedArticlesParams): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }>
  getArticle(params: GetFeedArticleParams): Promise<HydratedArticle>
  getComments(params: GetFeedCommentsParams): Promise<HydratedComment[]>
}
