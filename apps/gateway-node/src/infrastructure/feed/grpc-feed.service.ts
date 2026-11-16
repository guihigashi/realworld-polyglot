import { Metadata, status } from "@grpc/grpc-js"
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common"
import type { ClientGrpc } from "@nestjs/microservices"
import { lastValueFrom } from "rxjs"
import type {
  HydratedArticle,
  HydratedArticleSummary,
  HydratedComment,
} from "@/domain/article/entities/article.types.js"
import { ArticleNotFoundException } from "@/domain/article/exceptions/article.exceptions.js"
import type {
  FeedService,
  GetFeedArticleParams,
  GetFeedCommentsParams,
  GetFeedParams,
  ListFeedArticlesParams,
} from "@/domain/feed/contracts/feed.service.js"
import type { ProfileData } from "@/domain/profile/entities/profile.entity.js"
import {
  type Article,
  type Author,
  type Comment,
  FEED_SERVICE_NAME,
  type FeedServiceClient,
} from "@/generated/grpc/feed.js"
import { getGrpcErrorCode } from "@/infrastructure/grpc/grpc-channel-options.js"

export const FEED_GRPC_CLIENT = Symbol("FEED_GRPC_CLIENT")

@Injectable()
export class GrpcFeedService implements FeedService, OnModuleInit {
  private client!: FeedServiceClient

  constructor(
    @Inject(FEED_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.client = this.grpcClient.getService<FeedServiceClient>(FEED_SERVICE_NAME)
  }

  async getFeed(params: GetFeedParams): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }> {
    const response = await lastValueFrom(
      this.client.getFeed(
        {
          limit: params.limit,
          offset: params.offset,
          ...(params.minFollowsVersion != null ? { minFollowsVersion: params.minFollowsVersion } : {}),
          ...(params.minFavoritesVersion != null ? { minFavoritesVersion: params.minFavoritesVersion } : {}),
        },
        this.createRequestorMetadata(params.requestorId),
      ),
    )

    return {
      articles: (response.articles ?? []).map((article) => this.mapArticleSummary(article)),
      articlesCount: response.articlesCount ?? 0,
    }
  }

  async getTags(): Promise<string[]> {
    const response = await lastValueFrom(this.client.getTags({}, new Metadata()))
    return (response.tags ?? []).map((t) => t.tag)
  }

  async listArticles(
    params: ListFeedArticlesParams,
  ): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }> {
    const response = await lastValueFrom(
      this.client.listArticles(
        {
          limit: params.limit,
          offset: params.offset,
          ...(params.tag != null ? { tag: params.tag } : {}),
          ...(params.author != null ? { author: params.author } : {}),
          ...(params.favorited != null ? { favorited: params.favorited } : {}),
          ...(params.minFavoritesVersion != null ? { minFavoritesVersion: params.minFavoritesVersion } : {}),
        },
        this.createRequestorMetadata(params.requestorId),
      ),
    )

    return {
      articles: (response.articles ?? []).map((article) => this.mapArticleSummary(article)),
      articlesCount: response.articlesCount ?? 0,
    }
  }

  async getArticle(params: GetFeedArticleParams): Promise<HydratedArticle> {
    try {
      const response = await lastValueFrom(
        this.client.getArticle(
          {
            slug: params.slug,
            ...(params.minFavoritesVersion != null ? { minFavoritesVersion: params.minFavoritesVersion } : {}),
            ...(params.minFollowsVersion != null ? { minFollowsVersion: params.minFollowsVersion } : {}),
          },
          this.createRequestorMetadata(params.requestorId),
        ),
      )

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

  async getComments(params: GetFeedCommentsParams): Promise<HydratedComment[]> {
    try {
      const response = await lastValueFrom(
        this.client.getComments(
          {
            slug: params.slug,
            ...(params.minFollowsVersion != null ? { minFollowsVersion: params.minFollowsVersion } : {}),
          },
          this.createRequestorMetadata(params.requestorId),
        ),
      )

      return (response.comments ?? []).map((comment) => this.mapComment(comment))
    } catch (error) {
      if (getGrpcErrorCode(error) === status.NOT_FOUND) {
        throw new ArticleNotFoundException()
      }
      throw error
    }
  }

  private createRequestorMetadata(requestorId?: string | null): Metadata {
    const metadata = new Metadata()
    if (requestorId) {
      metadata.set("x-requestor-id", requestorId)
    }
    return metadata
  }

  private mapAuthor(author?: Author): ProfileData | null {
    if (!author) {
      return null
    }
    return {
      username: author.username ?? "",
      bio: author.bio || null,
      image: author.image || null,
      following: author.following ?? false,
    }
  }

  private mapArticleSummary(article: Article): HydratedArticleSummary {
    return {
      slug: article.slug ?? "",
      title: article.title ?? "",
      description: article.description ?? "",
      tagList: article.tagList ?? [],
      createdAt: article.createdAt ?? "",
      updatedAt: article.updatedAt ?? "",
      favorited: article.favorited ?? false,
      favoritesCount: article.favoritesCount ?? 0,
      author: this.mapAuthor(article.author),
    }
  }

  private mapArticle(article: Article): HydratedArticle {
    return {
      ...this.mapArticleSummary(article),
      body: article.body ?? "",
    }
  }

  private mapComment(comment: Comment): HydratedComment {
    return {
      id: Number(comment.id ?? 0),
      createdAt: comment.createdAt ?? "",
      updatedAt: comment.updatedAt ?? "",
      body: comment.body ?? "",
      author: this.mapAuthor(comment.author),
    }
  }
}
