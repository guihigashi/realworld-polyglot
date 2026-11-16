import { type Metadata, status } from "@grpc/grpc-js"
import type { ClientGrpc } from "@nestjs/microservices"
import { of, throwError } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { ArticleNotFoundException } from "@/domain/article/exceptions/article.exceptions.js"
import type { FeedServiceClient, GetFeedResponse } from "@/generated/grpc/feed.js"
import { GrpcFeedService } from "@/infrastructure/feed/grpc-feed.service.js"

function createServiceWithMockClient() {
  const getFeed = vi.fn<FeedServiceClient["getFeed"]>()
  const getTags = vi.fn<FeedServiceClient["getTags"]>()
  const listArticles = vi.fn<FeedServiceClient["listArticles"]>()
  const getArticle = vi.fn<FeedServiceClient["getArticle"]>()
  const getComments = vi.fn<FeedServiceClient["getComments"]>()

  const clientMock: FeedServiceClient = {
    getFeed,
    getTags,
    listArticles,
    getArticle,
    getComments,
  }

  const grpcClient = {
    getService: vi.fn().mockReturnValue(clientMock),
  } as unknown as ClientGrpc

  const service = new GrpcFeedService(grpcClient)
  service.onModuleInit()

  return { service, getFeed, getTags, listArticles, getArticle, getComments }
}

const sampleProtoArticle = {
  slug: "how-to-train-your-dragon",
  title: "How to train your dragon",
  description: "Ever wonder how?",
  tagList: ["dragons"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  favorited: false,
  favoritesCount: 0,
  body: "Very carefully.",
  author: {
    username: "jake",
    bio: "",
    image: "",
    following: false,
  },
}

describe("GrpcFeedService", () => {
  it("lists articles and feed without body field and normalizes empty author bio/image to null", async () => {
    const { service, listArticles, getFeed } = createServiceWithMockClient()

    listArticles.mockReturnValue(of({ articles: [sampleProtoArticle], articlesCount: 1 }))
    getFeed.mockReturnValue(of({} as GetFeedResponse))

    const listed = await service.listArticles({
      limit: 20,
      offset: 0,
      tag: "dragons",
      minFavoritesVersion: 4,
    })

    expect(listed.articlesCount).toBe(1)
    expect(listed.articles[0]).not.toHaveProperty("body")
    expect(listed.articles[0].author).toEqual({
      username: "jake",
      bio: null,
      image: null,
      following: false,
    })
    expect(listArticles.mock.calls[0][0]).toEqual({
      limit: 20,
      offset: 0,
      tag: "dragons",
      minFavoritesVersion: 4,
    })

    const feed = await service.getFeed({
      limit: 10,
      offset: 5,
      requestorId: "usr-1",
      minFollowsVersion: 7,
      minFavoritesVersion: 8,
    })
    expect(feed).toEqual({ articles: [], articlesCount: 0 })
    expect(getFeed.mock.calls[0][0]).toEqual({
      limit: 10,
      offset: 5,
      minFollowsVersion: 7,
      minFavoritesVersion: 8,
    })
    expect((getFeed.mock.calls[0][1] as Metadata).get("x-requestor-id")).toEqual(["usr-1"])
  })

  it("gets single article with body and maps NOT_FOUND to ArticleNotFoundException", async () => {
    const { service, getArticle, getComments } = createServiceWithMockClient()

    getArticle.mockReturnValueOnce(of({ article: sampleProtoArticle }))
    const article = await service.getArticle({
      slug: "how-to-train-your-dragon",
      requestorId: "usr-1",
      minFollowsVersion: 2,
      minFavoritesVersion: 3,
    })
    expect(article.body).toBe("Very carefully.")

    const notFoundErr = Object.assign(new Error("not found"), { code: status.NOT_FOUND })
    getArticle.mockReturnValueOnce(throwError(() => notFoundErr))
    getComments.mockReturnValueOnce(throwError(() => notFoundErr))

    await expect(service.getArticle({ slug: "missing" })).rejects.toThrow(ArticleNotFoundException)
    await expect(service.getComments({ slug: "missing" })).rejects.toThrow(ArticleNotFoundException)
  })

  it("extracts tag strings from CountedTag responses", async () => {
    const { service, getTags } = createServiceWithMockClient()
    getTags.mockReturnValue(
      of({
        tags: [
          { tag: "dragons", count: 5 },
          { tag: "training", count: 2 },
        ],
      }),
    )

    expect(await service.getTags()).toEqual(["dragons", "training"])
  })
})
