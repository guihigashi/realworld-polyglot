import { describe, expect, it, vi } from "vitest"
import { AddCommentUseCase } from "@/application/article/use-cases/add-comment.use-case.js"
import { CreateArticleUseCase } from "@/application/article/use-cases/create-article.use-case.js"
import { DeleteArticleUseCase } from "@/application/article/use-cases/delete-article.use-case.js"
import { DeleteCommentUseCase } from "@/application/article/use-cases/delete-comment.use-case.js"
import { FavoriteArticleUseCase } from "@/application/article/use-cases/favorite-article.use-case.js"
import { GetArticleUseCase } from "@/application/article/use-cases/get-article.use-case.js"
import { GetCommentsUseCase } from "@/application/article/use-cases/get-comments.use-case.js"
import { GetTagsUseCase } from "@/application/article/use-cases/get-tags.use-case.js"
import { ListArticlesUseCase } from "@/application/article/use-cases/list-articles.use-case.js"
import { UnfavoriteArticleUseCase } from "@/application/article/use-cases/unfavorite-article.use-case.js"
import { UpdateArticleUseCase } from "@/application/article/use-cases/update-article.use-case.js"
import { GetFeedUseCase } from "@/application/feed/use-cases/get-feed.use-case.js"
import type { ArticleService } from "@/domain/article/contracts/article.service.js"
import type { FeedService } from "@/domain/feed/contracts/feed.service.js"
import type { SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { Profile } from "@/domain/profile/entities/profile.entity.js"

function createMocks() {
  const articleServiceMock = {
    getArticle: vi.fn<ArticleService["getArticle"]>(),
    listArticles: vi.fn<ArticleService["listArticles"]>(),
    createArticle: vi.fn<ArticleService["createArticle"]>(),
    updateArticle: vi.fn<ArticleService["updateArticle"]>(),
    deleteArticle: vi.fn<ArticleService["deleteArticle"]>(),
    addComment: vi.fn<ArticleService["addComment"]>(),
    getComments: vi.fn<ArticleService["getComments"]>(),
    deleteComment: vi.fn<ArticleService["deleteComment"]>(),
    favoriteArticle: vi.fn<ArticleService["favoriteArticle"]>(),
    unfavoriteArticle: vi.fn<ArticleService["unfavoriteArticle"]>(),
    getTags: vi.fn<ArticleService["getTags"]>(),
  }

  const feedServiceMock = {
    getFeed: vi.fn<FeedService["getFeed"]>(),
    getTags: vi.fn<FeedService["getTags"]>(),
    listArticles: vi.fn<FeedService["listArticles"]>(),
    getArticle: vi.fn<FeedService["getArticle"]>(),
    getComments: vi.fn<FeedService["getComments"]>(),
  }

  const socialGraphMock = {
    getProfile: vi.fn<SocialGraphService["getProfile"]>(),
    followUser: vi.fn<SocialGraphService["followUser"]>(),
    unfollowUser: vi.fn<SocialGraphService["unfollowUser"]>(),
    getProfilesByIds: vi.fn<SocialGraphService["getProfilesByIds"]>(),
    upsertProfileProjection: vi.fn<SocialGraphService["upsertProfileProjection"]>(),
  }

  return {
    articleService: articleServiceMock as ArticleService,
    feedService: feedServiceMock as FeedService,
    socialGraph: socialGraphMock as SocialGraphService,
    articleServiceMock,
    feedServiceMock,
    socialGraphMock,
  }
}

describe("Article & Feed use cases", () => {
  it("CreateArticleUseCase and UpdateArticleUseCase hydrate author profile and omit authorId", async () => {
    const { articleService, socialGraph, articleServiceMock, socialGraphMock } = createMocks()
    const profile = new Profile({ username: "alice", bio: "Dev", image: null, following: false })

    articleServiceMock.createArticle.mockResolvedValue({
      slug: "hello-world",
      title: "Hello World",
      description: "Desc",
      body: "Body",
      tagList: ["ts"],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      favorited: false,
      favoritesCount: 0,
      authorId: "usr-1",
    })
    articleServiceMock.updateArticle.mockResolvedValue({
      slug: "hello-world",
      title: "Hello World",
      description: "Desc",
      body: "Updated",
      tagList: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      favorited: false,
      favoritesCount: 0,
      authorId: "usr-1",
    })
    socialGraphMock.getProfilesByIds.mockResolvedValue({ "usr-1": profile })

    const created = await new CreateArticleUseCase(articleService, socialGraph).execute(
      { title: "Hello World", description: "Desc", body: "Body", tagList: ["ts"] },
      "usr-1",
    )
    expect(created).not.toHaveProperty("authorId")
    expect(created.author).toEqual({ username: "alice", bio: "Dev", image: null, following: false })

    const updated = await new UpdateArticleUseCase(articleService, socialGraph).execute(
      "hello-world",
      { body: "Updated", tagList: [] },
      "usr-1",
    )
    expect(updated.body).toBe("Updated")
    expect(updated.tagList).toEqual([])
    expect(updated.author).toEqual({ username: "alice", bio: "Dev", image: null, following: false })
  })

  it("AddCommentUseCase hydrates author profile", async () => {
    const { articleService, socialGraph, articleServiceMock, socialGraphMock } = createMocks()
    articleServiceMock.addComment.mockResolvedValue({
      id: 9,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      body: "Nice post",
      authorId: "usr-2",
    })
    socialGraphMock.getProfilesByIds.mockResolvedValue({
      "usr-2": new Profile({ username: "bob", bio: null, image: null, following: false }),
    })

    const comment = await new AddCommentUseCase(articleService, socialGraph).execute("hello", "Nice post", "usr-2")
    expect(comment).toEqual({
      id: 9,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      body: "Nice post",
      author: { username: "bob", bio: null, image: null, following: false },
    })
  })

  it("FavoriteArticleUseCase and UnfavoriteArticleUseCase hydrate author and return favoritesVersion", async () => {
    const { articleService, socialGraph, articleServiceMock, socialGraphMock } = createMocks()
    const baseArticle = {
      slug: "hello",
      title: "Hello",
      description: "Desc",
      body: "Body",
      tagList: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      favoritesCount: 1,
      authorId: "usr-author",
    }

    articleServiceMock.favoriteArticle.mockResolvedValue({
      article: { ...baseArticle, favorited: true },
      favoritesVersion: 5,
    })
    articleServiceMock.unfavoriteArticle.mockResolvedValue({
      article: { ...baseArticle, favorited: false, favoritesCount: 0 },
      favoritesVersion: 6,
    })
    socialGraphMock.getProfilesByIds.mockResolvedValue({
      "usr-author": new Profile({ username: "author", bio: null, image: null, following: true }),
    })

    const favResult = await new FavoriteArticleUseCase(articleService, socialGraph).execute("hello", "usr-viewer")
    expect(favResult.favoritesVersion).toBe(5)
    expect(favResult.article.favorited).toBe(true)
    expect(favResult.article.author?.username).toBe("author")
    expect(socialGraphMock.getProfilesByIds).toHaveBeenCalledWith(["usr-author"], "usr-viewer")

    const unfavResult = await new UnfavoriteArticleUseCase(articleService, socialGraph).execute("hello", "usr-viewer")
    expect(unfavResult.favoritesVersion).toBe(6)
    expect(unfavResult.article.favorited).toBe(false)
  })

  it("delegates read, delete, and feed use cases", async () => {
    const { articleService, feedService, articleServiceMock, feedServiceMock } = createMocks()

    feedServiceMock.listArticles.mockResolvedValue({ articles: [], articlesCount: 0 })
    feedServiceMock.getFeed.mockResolvedValue({ articles: [], articlesCount: 0 })
    feedServiceMock.getTags.mockResolvedValue(["nestjs"])
    feedServiceMock.getComments.mockResolvedValue([])
    feedServiceMock.getArticle.mockResolvedValue({
      slug: "s",
      title: "T",
      description: "D",
      body: "B",
      tagList: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      favorited: false,
      favoritesCount: 0,
      author: null,
    })

    await new ListArticlesUseCase(feedService).execute({ limit: 10, offset: 0 })
    expect(feedServiceMock.listArticles).toHaveBeenCalledWith({ limit: 10, offset: 0 })

    await new GetFeedUseCase(feedService).execute({ limit: 5, offset: 1, requestorId: "u1", minFollowsVersion: 3 })
    expect(feedServiceMock.getFeed).toHaveBeenCalledWith({
      limit: 5,
      offset: 1,
      requestorId: "u1",
      minFollowsVersion: 3,
    })

    expect(await new GetTagsUseCase(feedService).execute()).toEqual(["nestjs"])
    await new GetArticleUseCase(feedService).execute({ slug: "s" })
    expect(feedServiceMock.getArticle).toHaveBeenCalledWith({ slug: "s" })
    await new GetCommentsUseCase(feedService).execute({ slug: "s" })
    expect(feedServiceMock.getComments).toHaveBeenCalledWith({ slug: "s" })

    await new DeleteArticleUseCase(articleService).execute("s", "u1")
    expect(articleServiceMock.deleteArticle).toHaveBeenCalledWith("s", "u1")

    await new DeleteCommentUseCase(articleService).execute("s", 12, "u1")
    expect(articleServiceMock.deleteComment).toHaveBeenCalledWith("s", 12, "u1")
  })
})
