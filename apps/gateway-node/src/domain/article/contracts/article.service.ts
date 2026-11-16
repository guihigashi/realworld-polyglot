import type {
  ArticleData,
  ArticleSummaryData,
  CommentData,
  CreateArticleInput,
  UpdateArticleInput,
} from "@/domain/article/entities/article.types.js"

export const ARTICLE_SERVICE = Symbol("ARTICLE_SERVICE")

export interface ListArticleServiceParams {
  tag?: string | null
  authorId?: string | null
  favoritedById?: string | null
  limit: number
  offset: number
  requestorId?: string | null
}

export interface ArticleService {
  getArticle(slug: string, requestorId?: string | null): Promise<ArticleData>
  listArticles(params: ListArticleServiceParams): Promise<{ articles: ArticleSummaryData[]; articlesCount: number }>
  createArticle(payload: CreateArticleInput, authorId: string): Promise<ArticleData>
  updateArticle(slug: string, payload: UpdateArticleInput, requestorId: string): Promise<ArticleData>
  deleteArticle(slug: string, requestorId: string): Promise<void>
  addComment(slug: string, body: string, authorId: string): Promise<CommentData>
  getComments(slug: string, requestorId?: string | null): Promise<CommentData[]>
  deleteComment(slug: string, id: number, requestorId: string): Promise<void>
  favoriteArticle(slug: string, requestorId: string): Promise<{ article: ArticleData; favoritesVersion: number }>
  unfavoriteArticle(slug: string, requestorId: string): Promise<{ article: ArticleData; favoritesVersion: number }>
  getTags(): Promise<string[]>
}
