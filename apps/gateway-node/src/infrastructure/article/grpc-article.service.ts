import { Metadata, status } from "@grpc/grpc-js"
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common"
import type { ClientGrpc } from "@nestjs/microservices"
import { lastValueFrom } from "rxjs"
import type { ArticleService, ListArticleServiceParams } from "@/domain/article/contracts/article.service.js"
import type {
  ArticleData,
  ArticleSummaryData,
  CommentData,
  CreateArticleInput,
  UpdateArticleInput,
} from "@/domain/article/entities/article.types.js"
import {
  ArticleNotFoundException,
  CommentNotFoundException,
  ForbiddenException,
} from "@/domain/article/exceptions/article.exceptions.js"
import {
  type Article,
  ARTICLE_SERVICE_NAME,
  type ArticleServiceClient,
  type ArticleSummary,
  type Comment,
} from "@/generated/grpc/article.js"
import { getGrpcErrorCode, getGrpcErrorDetails } from "@/infrastructure/grpc/grpc-channel-options.js"

export const ARTICLE_GRPC_CLIENT = Symbol("ARTICLE_GRPC_CLIENT")

@Injectable()
export class GrpcArticleService implements ArticleService, OnModuleInit {
  private client!: ArticleServiceClient

  constructor(
    @Inject(ARTICLE_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.client = this.grpcClient.getService<ArticleServiceClient>(ARTICLE_SERVICE_NAME)
  }

  async listArticles(
    params: ListArticleServiceParams,
  ): Promise<{ articles: ArticleSummaryData[]; articlesCount: number }> {
    const response = await lastValueFrom(
      this.client.listArticles(
        {
          limit: params.limit,
          offset: params.offset,
          ...(params.tag != null ? { tag: params.tag } : {}),
          ...(params.authorId != null ? { authorId: params.authorId } : {}),
          ...(params.favoritedById != null ? { favoritedById: params.favoritedById } : {}),
        },
        this.createRequestorMetadata(params.requestorId),
      ),
    )

    return {
      articles: (response.articles ?? []).map((article) => this.mapArticleSummary(article)),
      articlesCount: response.totalCount ?? 0,
    }
  }

  async getArticle(slug: string, requestorId?: string | null): Promise<ArticleData> {
    try {
      const response = await lastValueFrom(this.client.getArticle({ slug }, this.createRequestorMetadata(requestorId)))
      if (!response.article) {
        throw new ArticleNotFoundException()
      }
      return this.mapArticle(response.article)
    } catch (error) {
      if (getGrpcErrorCode(error) === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      throw error
    }
  }

  async createArticle(payload: CreateArticleInput, authorId: string): Promise<ArticleData> {
    const response = await lastValueFrom(
      this.client.createArticle(
        {
          title: payload.title,
          description: payload.description,
          body: payload.body,
          tagList: payload.tagList ?? [],
        },
        this.createRequestorMetadata(authorId),
      ),
    )

    if (!response.article) {
      throw new Error("ArticleService returned empty article on createArticle")
    }
    return this.mapArticle(response.article)
  }

  async updateArticle(slug: string, payload: UpdateArticleInput, requestorId: string): Promise<ArticleData> {
    try {
      const response = await lastValueFrom(
        this.client.updateArticle(
          {
            slug,
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            ...(payload.body !== undefined ? { body: payload.body } : {}),
            ...(payload.tagList !== undefined ? { tagList: { tags: payload.tagList } } : {}),
          },
          this.createRequestorMetadata(requestorId),
        ),
      )
      if (!response.article) {
        throw new ArticleNotFoundException()
      }
      return this.mapArticle(response.article)
    } catch (error) {
      const code = getGrpcErrorCode(error)
      if (code === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      if (code === status.PERMISSION_DENIED) {
        throw new ForbiddenException("article")
      }
      throw error
    }
  }

  async deleteArticle(slug: string, requestorId: string): Promise<void> {
    try {
      await lastValueFrom(this.client.deleteArticle({ slug }, this.createRequestorMetadata(requestorId)))
    } catch (error) {
      const code = getGrpcErrorCode(error)
      if (code === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      if (code === status.PERMISSION_DENIED) {
        throw new ForbiddenException("article")
      }
      throw error
    }
  }

  async addComment(slug: string, body: string, authorId: string): Promise<CommentData> {
    try {
      const response = await lastValueFrom(
        this.client.addComment({ slug, body }, this.createRequestorMetadata(authorId)),
      )
      if (!response.comment) {
        throw new Error("ArticleService returned empty comment on addComment")
      }
      return this.mapComment(response.comment)
    } catch (error) {
      if (getGrpcErrorCode(error) === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      throw error
    }
  }

  async getComments(slug: string, requestorId?: string | null): Promise<CommentData[]> {
    try {
      const response = await lastValueFrom(this.client.getComments({ slug }, this.createRequestorMetadata(requestorId)))
      return (response.comments ?? []).map((comment) => this.mapComment(comment))
    } catch (error) {
      if (getGrpcErrorCode(error) === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      throw error
    }
  }

  async deleteComment(slug: string, id: number, requestorId: string): Promise<void> {
    try {
      await lastValueFrom(this.client.deleteComment({ slug, id }, this.createRequestorMetadata(requestorId)))
    } catch (error) {
      const code = getGrpcErrorCode(error)
      if (code === status.NOT_FOUND) {
        const details = getGrpcErrorDetails(error)
        if (/comment not found/i.test(details)) {
          throw new CommentNotFoundException()
        }
        throw new ArticleNotFoundException()
      }
      if (code === status.PERMISSION_DENIED) {
        throw new ForbiddenException("comment")
      }
      throw error
    }
  }

  async favoriteArticle(
    slug: string,
    requestorId: string,
  ): Promise<{ article: ArticleData; favoritesVersion: number }> {
    try {
      const response = await lastValueFrom(
        this.client.favoriteArticle({ slug }, this.createRequestorMetadata(requestorId)),
      )
      if (!response.article) {
        throw new ArticleNotFoundException()
      }
      return {
        article: this.mapArticle(response.article),
        favoritesVersion: Number(response.favoritesVersion ?? 0),
      }
    } catch (error) {
      if (getGrpcErrorCode(error) === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      throw error
    }
  }

  async unfavoriteArticle(
    slug: string,
    requestorId: string,
  ): Promise<{ article: ArticleData; favoritesVersion: number }> {
    try {
      const response = await lastValueFrom(
        this.client.unfavoriteArticle({ slug }, this.createRequestorMetadata(requestorId)),
      )
      if (!response.article) {
        throw new ArticleNotFoundException()
      }
      return {
        article: this.mapArticle(response.article),
        favoritesVersion: Number(response.favoritesVersion ?? 0),
      }
    } catch (error) {
      if (getGrpcErrorCode(error) === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      throw error
    }
  }

  async getTags(): Promise<string[]> {
    const response = await lastValueFrom(this.client.getTags({}, new Metadata()))
    return (response.tags ?? []).map((t) => t.tag)
  }

  private createRequestorMetadata(requestorId?: string | null): Metadata {
    const metadata = new Metadata()
    if (requestorId) {
      metadata.set("x-requestor-id", requestorId)
    }
    return metadata
  }

  private mapArticle(article: Article): ArticleData {
    return {
      slug: article.slug ?? "",
      title: article.title ?? "",
      description: article.description ?? "",
      body: article.body ?? "",
      tagList: article.tagList ?? [],
      createdAt: article.createdAt ?? "",
      updatedAt: article.updatedAt ?? "",
      favorited: article.favorited ?? false,
      favoritesCount: article.favoritesCount ?? 0,
      authorId: article.authorId ?? "",
    }
  }

  private mapArticleSummary(article: ArticleSummary): ArticleSummaryData {
    return {
      slug: article.slug ?? "",
      title: article.title ?? "",
      description: article.description ?? "",
      tagList: article.tagList ?? [],
      createdAt: article.createdAt ?? "",
      updatedAt: article.updatedAt ?? "",
      favorited: article.favorited ?? false,
      favoritesCount: article.favoritesCount ?? 0,
      authorId: article.authorId ?? "",
    }
  }

  private mapComment(comment: Comment): CommentData {
    return {
      id: Number(comment.id ?? 0),
      createdAt: comment.createdAt ?? "",
      updatedAt: comment.updatedAt ?? "",
      body: comment.body ?? "",
      authorId: comment.authorId ?? "",
    }
  }
}
