import { type Metadata, status } from "@grpc/grpc-js"
import type { ClientGrpc } from "@nestjs/microservices"
import { of, throwError } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  ArticleNotFoundException,
  CommentNotFoundException,
  ForbiddenException,
} from "@/domain/article/exceptions/article.exceptions.js"
import type { ArticleResponse, ArticleServiceClient } from "@/generated/grpc/article.js"
import { GrpcArticleService } from "@/infrastructure/article/grpc-article.service.js"

function createServiceWithMockClient() {
  const listArticles = vi.fn<ArticleServiceClient["listArticles"]>()
  const getArticle = vi.fn<ArticleServiceClient["getArticle"]>()
  const createArticle = vi.fn<ArticleServiceClient["createArticle"]>()
  const updateArticle = vi.fn<ArticleServiceClient["updateArticle"]>()
  const deleteArticle = vi.fn<ArticleServiceClient["deleteArticle"]>()
  const addComment = vi.fn<ArticleServiceClient["addComment"]>()
  const getComments = vi.fn<ArticleServiceClient["getComments"]>()
  const deleteComment = vi.fn<ArticleServiceClient["deleteComment"]>()
  const favoriteArticle = vi.fn<ArticleServiceClient["favoriteArticle"]>()
  const unfavoriteArticle = vi.fn<ArticleServiceClient["unfavoriteArticle"]>()
  const getTags = vi.fn<ArticleServiceClient["getTags"]>()
  const getArticlesFeed = vi.fn<ArticleServiceClient["getArticlesFeed"]>()
  const userFavoritedArticles = vi.fn<ArticleServiceClient["userFavoritedArticles"]>()

  const clientMock: ArticleServiceClient = {
    listArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    addComment,
    getComments,
    deleteComment,
    favoriteArticle,
    unfavoriteArticle,
    getTags,
    getArticlesFeed,
    userFavoritedArticles,
  }

  const grpcClient = {
    getService: vi.fn().mockReturnValue(clientMock),
  } as unknown as ClientGrpc

  const service = new GrpcArticleService(grpcClient)
  service.onModuleInit()

  return {
    service,
    createArticle,
    updateArticle,
    deleteArticle,
    addComment,
    deleteComment,
    favoriteArticle,
    unfavoriteArticle,
  }
}

describe("GrpcArticleService", () => {
  it("creates and updates articles with partial fields and tagList clearing", async () => {
    const { service, createArticle, updateArticle } = createServiceWithMockClient()

    createArticle.mockReturnValue(
      of({
        article: {
          id: "art-1",
          slug: "test-slug",
          title: "Test",
          description: "Desc",
          body: "Body",
          tagList: ["a", "b"],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          authorId: "usr-1",
          version: 1,
        },
      } as unknown as ArticleResponse),
    )

    const created = await service.createArticle(
      { title: "Test", description: "Desc", body: "Body", tagList: ["a", "b"] },
      "usr-1",
    )
    expect(created.slug).toBe("test-slug")
    expect(created.favorited).toBe(false)
    expect(created.favoritesCount).toBe(0)
    expect((createArticle.mock.calls[0][1] as Metadata).get("x-requestor-id")).toEqual(["usr-1"])

    updateArticle.mockReturnValue(
      of({
        favoritesVersion: 0,
        article: {
          id: "art-1",
          slug: "test-slug",
          title: "Test",
          description: "Desc",
          body: "New Body",
          tagList: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
          favorited: false,
          favoritesCount: 0,
          authorId: "usr-1",
          version: 2,
        },
      }),
    )

    await service.updateArticle("test-slug", { body: "New Body", tagList: [] }, "usr-1")
    expect(updateArticle.mock.calls[0][0]).toEqual({
      slug: "test-slug",
      body: "New Body",
      tagList: { tags: [] },
    })

    await service.updateArticle("test-slug", { body: "Keep tags" }, "usr-1")
    expect(updateArticle.mock.calls[1][0]).toEqual({
      slug: "test-slug",
      body: "Keep tags",
    })
  })

  it("maps NOT_FOUND and PERMISSION_DENIED errors for articles and comments", async () => {
    const { service, updateArticle, deleteArticle, addComment, deleteComment } = createServiceWithMockClient()

    const artNotFound = Object.assign(new Error("article not found"), {
      code: status.NOT_FOUND,
      details: "article not found",
    })
    const commentNotFound = Object.assign(new Error("comment not found"), {
      code: status.NOT_FOUND,
      details: "comment not found",
    })
    const forbidden = Object.assign(new Error("forbidden"), {
      code: status.PERMISSION_DENIED,
      details: "forbidden",
    })

    updateArticle.mockReturnValueOnce(throwError(() => forbidden))
    deleteArticle.mockReturnValueOnce(throwError(() => artNotFound))
    deleteArticle.mockReturnValueOnce(throwError(() => forbidden))
    addComment.mockReturnValueOnce(throwError(() => artNotFound))
    deleteComment.mockReturnValueOnce(throwError(() => artNotFound))
    deleteComment.mockReturnValueOnce(throwError(() => commentNotFound))
    deleteComment.mockReturnValueOnce(throwError(() => forbidden))

    await expect(service.updateArticle("slug", { body: "x" }, "u2")).rejects.toThrow(ForbiddenException)
    await expect(service.deleteArticle("slug", "u2")).rejects.toThrow(ArticleNotFoundException)
    await expect(service.deleteArticle("slug", "u2")).rejects.toMatchObject({ entity: "article" })
    await expect(service.addComment("missing", "hi", "u1")).rejects.toThrow(ArticleNotFoundException)
    await expect(service.deleteComment("missing", 1, "u1")).rejects.toThrow(ArticleNotFoundException)
    await expect(service.deleteComment("slug", 999, "u1")).rejects.toThrow(CommentNotFoundException)
    await expect(service.deleteComment("slug", 1, "u2")).rejects.toMatchObject({ entity: "comment" })
  })

  it("favorites and unfavorites articles returning favoritesVersion", async () => {
    const { service, favoriteArticle, unfavoriteArticle } = createServiceWithMockClient()

    favoriteArticle.mockReturnValue(
      of({
        favoritesVersion: 9,
        article: {
          id: "a1",
          slug: "s1",
          title: "T",
          description: "D",
          body: "B",
          tagList: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          favorited: true,
          favoritesCount: 1,
          authorId: "u1",
          version: 1,
        },
      }),
    )

    unfavoriteArticle.mockReturnValue(
      of({
        favoritesVersion: 10,
        article: {
          id: "a1",
          slug: "s1",
          title: "T",
          description: "D",
          body: "B",
          tagList: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          favorited: false,
          favoritesCount: 0,
          authorId: "u1",
          version: 1,
        },
      }),
    )

    const fav = await service.favoriteArticle("s1", "u2")
    expect(fav.favoritesVersion).toBe(9)
    expect(fav.article.favorited).toBe(true)

    const unfav = await service.unfavoriteArticle("s1", "u2")
    expect(unfav.favoritesVersion).toBe(10)
    expect(unfav.article.favorited).toBe(false)
  })
})
