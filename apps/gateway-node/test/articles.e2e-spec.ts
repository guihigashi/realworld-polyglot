import { RequestMethod } from "@nestjs/common"
import type { NestNodeApplication } from "@nestjs/platform-node"
import { NodeAdapter } from "@nestjs/platform-node"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { AppModule } from "@/app.module.js"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"
import type {
  ArticleData,
  ArticleSummaryData,
  CommentData,
  CreateArticleInput,
  HydratedArticle,
  HydratedArticleSummary,
  HydratedComment,
  UpdateArticleInput,
} from "@/domain/article/entities/article.types.js"
import {
  ArticleNotFoundException,
  CommentNotFoundException,
  ForbiddenException,
} from "@/domain/article/exceptions/article.exceptions.js"
import { JWT_GENERATOR, type JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import { USER_REPOSITORY, type UserRepository } from "@/domain/auth/contracts/user.repository.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { EVENT_PUBLISHER } from "@/domain/contracts/event-publisher.js"
import {
  FEED_SERVICE,
  type FeedService,
  type GetFeedArticleParams,
  type GetFeedCommentsParams,
  type GetFeedParams,
  type ListFeedArticlesParams,
} from "@/domain/feed/contracts/feed.service.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"
import { Profile } from "@/domain/profile/entities/profile.entity.js"
import { ProfileNotFoundException } from "@/domain/profile/exceptions/profile.exceptions.js"
import { InMemoryEventPublisher } from "@/infrastructure/messaging/in-memory-event-publisher.js"
import { NODE_ADAPTER_OPTIONS } from "@/presentation/http/node-adapter.options.js"

interface StoredArticle extends ArticleData {
  favoritedBy: Set<string>
}

class InMemorySocialAndArticleBackend implements ArticleService, FeedService, SocialGraphService {
  private readonly usersById = new Map<
    string,
    { id: string; username: string; bio: string | null; image: string | null }
  >()
  private readonly follows = new Map<string, Set<string>>()
  private readonly articles = new Map<string, StoredArticle>()
  private readonly comments = new Map<string, CommentData[]>()
  private commentSeq = 0
  private slugSeq = 0
  private favoritesVersion = 0
  readonly recordedFeedCalls: {
    getFeed?: GetFeedParams
    listArticles?: ListFeedArticlesParams
    getArticle?: GetFeedArticleParams
    getComments?: GetFeedCommentsParams
  } = {}

  async upsertProfileProjection(user: User): Promise<void> {
    this.usersById.set(user.getId(), {
      id: user.getId(),
      username: user.getUsername(),
      bio: user.getBio(),
      image: user.getImage(),
    })
  }

  async getProfile(targetUsername: string, requestorId?: string | null): Promise<Profile> {
    const user = [...this.usersById.values()].find((u) => u.username === targetUsername)
    if (!user) {
      throw new ProfileNotFoundException()
    }
    const following = requestorId ? (this.follows.get(requestorId)?.has(user.id) ?? false) : false
    return new Profile({ username: user.username, bio: user.bio, image: user.image, following })
  }

  async followUser(followerId: string, targetUsername: string): Promise<Profile> {
    const target = [...this.usersById.values()].find((u) => u.username === targetUsername)
    if (!target) {
      throw new ProfileNotFoundException()
    }
    const set = this.follows.get(followerId) ?? new Set<string>()
    set.add(target.id)
    this.follows.set(followerId, set)
    return new Profile({
      username: target.username,
      bio: target.bio,
      image: target.image,
      following: true,
      followsVersion: 1,
    })
  }

  async unfollowUser(followerId: string, targetUsername: string): Promise<Profile> {
    const target = [...this.usersById.values()].find((u) => u.username === targetUsername)
    if (!target) {
      throw new ProfileNotFoundException()
    }
    this.follows.get(followerId)?.delete(target.id)
    return new Profile({
      username: target.username,
      bio: target.bio,
      image: target.image,
      following: false,
      followsVersion: 2,
    })
  }

  async getProfilesByIds(userIds: string[], requestorId?: string | null): Promise<Record<string, Profile>> {
    const res: Record<string, Profile> = {}
    for (const id of userIds) {
      const user = this.usersById.get(id)
      if (user) {
        const following = requestorId ? (this.follows.get(requestorId)?.has(id) ?? false) : false
        res[id] = new Profile({ username: user.username, bio: user.bio, image: user.image, following })
      }
    }
    return res
  }

  async createArticle(payload: CreateArticleInput, authorId: string): Promise<ArticleData> {
    this.slugSeq += 1
    const base = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const slug = `${base}-${this.slugSeq}`
    const now = new Date().toISOString()
    const stored: StoredArticle = {
      slug,
      title: payload.title,
      description: payload.description,
      body: payload.body,
      tagList: [...(payload.tagList ?? [])],
      createdAt: now,
      updatedAt: now,
      favorited: false,
      favoritesCount: 0,
      authorId,
      favoritedBy: new Set(),
    }
    this.articles.set(slug, stored)
    return this.toArticleData(stored, authorId)
  }

  async updateArticle(slug: string, payload: UpdateArticleInput, requestorId: string): Promise<ArticleData> {
    const existing = this.articles.get(slug)
    if (!existing) {
      throw new ArticleNotFoundException()
    }
    if (existing.authorId !== requestorId) {
      throw new ForbiddenException("article")
    }
    if (payload.title !== undefined) {
      existing.title = payload.title
    }
    if (payload.description !== undefined) {
      existing.description = payload.description
    }
    if (payload.body !== undefined) {
      existing.body = payload.body
    }
    if (payload.tagList !== undefined) {
      existing.tagList = [...payload.tagList]
    }
    existing.updatedAt = new Date().toISOString()
    return this.toArticleData(existing, requestorId)
  }

  async deleteArticle(slug: string, requestorId: string): Promise<void> {
    const existing = this.articles.get(slug)
    if (!existing) {
      throw new ArticleNotFoundException()
    }
    if (existing.authorId !== requestorId) {
      throw new ForbiddenException("article")
    }
    this.articles.delete(slug)
    this.comments.delete(slug)
  }

  async addComment(slug: string, body: string, authorId: string): Promise<CommentData> {
    if (!this.articles.has(slug)) {
      throw new ArticleNotFoundException()
    }
    this.commentSeq += 1
    const now = new Date().toISOString()
    const comment: CommentData = {
      id: this.commentSeq,
      createdAt: now,
      updatedAt: now,
      body,
      authorId,
    }
    const list = this.comments.get(slug) ?? []
    list.push(comment)
    this.comments.set(slug, list)
    return comment
  }

  async deleteComment(slug: string, id: number, requestorId: string): Promise<void> {
    if (!this.articles.has(slug)) {
      throw new ArticleNotFoundException()
    }
    const list = this.comments.get(slug) ?? []
    const idx = list.findIndex((c) => c.id === id)
    if (idx === -1) {
      throw new CommentNotFoundException()
    }
    if (list[idx].authorId !== requestorId) {
      throw new ForbiddenException("comment")
    }
    list.splice(idx, 1)
  }

  async favoriteArticle(
    slug: string,
    requestorId: string,
  ): Promise<{ article: ArticleData; favoritesVersion: number }> {
    const existing = this.articles.get(slug)
    if (!existing) {
      throw new ArticleNotFoundException()
    }
    existing.favoritedBy.add(requestorId)
    this.favoritesVersion += 1
    return {
      article: this.toArticleData(existing, requestorId),
      favoritesVersion: this.favoritesVersion,
    }
  }

  async unfavoriteArticle(
    slug: string,
    requestorId: string,
  ): Promise<{ article: ArticleData; favoritesVersion: number }> {
    const existing = this.articles.get(slug)
    if (!existing) {
      throw new ArticleNotFoundException()
    }
    existing.favoritedBy.delete(requestorId)
    this.favoritesVersion += 1
    return {
      article: this.toArticleData(existing, requestorId),
      favoritesVersion: this.favoritesVersion,
    }
  }

  async getArticle(slug: string, requestorId?: string | null): Promise<ArticleData>
  async getArticle(params: GetFeedArticleParams): Promise<HydratedArticle>
  async getArticle(
    slugOrParams: string | GetFeedArticleParams,
    requestorId?: string | null,
  ): Promise<ArticleData | HydratedArticle> {
    if (typeof slugOrParams === "string") {
      const found = this.articles.get(slugOrParams)
      if (!found) {
        throw new ArticleNotFoundException()
      }
      return this.toArticleData(found, requestorId)
    }

    this.recordedFeedCalls.getArticle = slugOrParams
    const found = this.articles.get(slugOrParams.slug)
    if (!found) {
      throw new ArticleNotFoundException()
    }
    return this.hydrateArticle(found, slugOrParams.requestorId)
  }

  async listArticles(
    params: ListFeedArticlesParams,
  ): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }>
  async listArticles(params: {
    tag?: string | null
    authorId?: string | null
    favoritedById?: string | null
    limit: number
    offset: number
    requestorId?: string | null
  }): Promise<{ articles: ArticleSummaryData[]; articlesCount: number }>
  async listArticles(
    params: ListFeedArticlesParams & { authorId?: string | null; favoritedById?: string | null },
  ): Promise<{ articles: HydratedArticleSummary[] | ArticleSummaryData[]; articlesCount: number }> {
    this.recordedFeedCalls.listArticles = params
    let items = [...this.articles.values()].reverse()
    if (params.tag) {
      items = items.filter((a) => a.tagList.includes(params.tag!))
    }
    if (params.author) {
      items = items.filter((a) => this.usersById.get(a.authorId)?.username === params.author)
    }
    if (params.favorited) {
      const favUser = [...this.usersById.values()].find((u) => u.username === params.favorited)
      items = favUser ? items.filter((a) => a.favoritedBy.has(favUser.id)) : []
    }
    const articlesCount = items.length
    const sliced = items.slice(params.offset, params.offset + params.limit)
    const hydrated = await Promise.all(sliced.map((a) => this.hydrateSummary(a, params.requestorId)))
    return { articles: hydrated, articlesCount }
  }

  async getFeed(params: GetFeedParams): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }> {
    this.recordedFeedCalls.getFeed = params
    const followingSet = this.follows.get(params.requestorId) ?? new Set<string>()
    const items = [...this.articles.values()].reverse().filter((a) => followingSet.has(a.authorId))
    const articlesCount = items.length
    const sliced = items.slice(params.offset, params.offset + params.limit)
    const hydrated = await Promise.all(sliced.map((a) => this.hydrateSummary(a, params.requestorId)))
    return { articles: hydrated, articlesCount }
  }

  async getComments(slug: string, requestorId?: string | null): Promise<CommentData[]>
  async getComments(params: GetFeedCommentsParams): Promise<HydratedComment[]>
  async getComments(
    slugOrParams: string | GetFeedCommentsParams,
    _requestorId?: string | null,
  ): Promise<CommentData[] | HydratedComment[]> {
    if (typeof slugOrParams === "string") {
      if (!this.articles.has(slugOrParams)) {
        throw new ArticleNotFoundException()
      }
      return this.comments.get(slugOrParams) ?? []
    }

    this.recordedFeedCalls.getComments = slugOrParams
    if (!this.articles.has(slugOrParams.slug)) {
      throw new ArticleNotFoundException()
    }
    const list = this.comments.get(slugOrParams.slug) ?? []
    return Promise.all(
      list.map(async (c) => {
        const profiles = await this.getProfilesByIds([c.authorId], slugOrParams.requestorId)
        return {
          id: c.id,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          body: c.body,
          author: profiles[c.authorId]?.toJSON() ?? null,
        }
      }),
    )
  }

  async getTags(): Promise<string[]> {
    const tags = new Set<string>()
    for (const article of this.articles.values()) {
      for (const tag of article.tagList) {
        tags.add(tag)
      }
    }
    return [...tags]
  }

  private toArticleData(article: StoredArticle, requestorId?: string | null): ArticleData {
    return {
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      tagList: article.tagList,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: requestorId ? article.favoritedBy.has(requestorId) : false,
      favoritesCount: article.favoritedBy.size,
      authorId: article.authorId,
    }
  }

  private async hydrateSummary(article: StoredArticle, requestorId?: string | null): Promise<HydratedArticleSummary> {
    const profiles = await this.getProfilesByIds([article.authorId], requestorId)
    return {
      slug: article.slug,
      title: article.title,
      description: article.description,
      tagList: article.tagList,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      favorited: requestorId ? article.favoritedBy.has(requestorId) : false,
      favoritesCount: article.favoritedBy.size,
      author: profiles[article.authorId]?.toJSON() ?? null,
    }
  }

  private async hydrateArticle(article: StoredArticle, requestorId?: string | null): Promise<HydratedArticle> {
    return {
      ...(await this.hydrateSummary(article, requestorId)),
      body: article.body,
    }
  }
}

describe("Articles, Comments, Favorites, Feed, and Tags (e2e)", () => {
  let app: NestNodeApplication
  let backend: InMemorySocialAndArticleBackend
  let jwtGenerator: JwtGenerator

  beforeEach(async () => {
    backend = new InMemorySocialAndArticleBackend()
    const dummyUserRepo: UserRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      save: vi.fn(),
    }

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOCIAL_GRAPH_SERVICE)
      .useValue(backend)
      .overrideProvider(ARTICLE_SERVICE)
      .useValue(backend)
      .overrideProvider(FEED_SERVICE)
      .useValue(backend)
      .overrideProvider(USER_REPOSITORY)
      .useValue(dummyUserRepo)
      .overrideProvider(EVENT_PUBLISHER)
      .useValue(new InMemoryEventPublisher())
      .compile()

    jwtGenerator = moduleRef.get<JwtGenerator>(JWT_GENERATOR)

    app = moduleRef.createNestApplication<NestNodeApplication>(new NodeAdapter(NODE_ADAPTER_OPTIONS))
    app.setGlobalPrefix("api", {
      exclude: [{ path: "", method: RequestMethod.GET }],
    })
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  async function seedUser(id: string, username: string) {
    const user = new User({ id, username, email: `${username}@test.com`, passwordHash: "hash" })
    await backend.upsertProfileProjection(user)
    return jwtGenerator.generateForUser(user)
  }

  it("supports article CRUD, listing without body, tag preservation, and tags endpoint", async () => {
    const tokenA = await seedUser("usr-a", "alice")

    const createRes = await request(app.getHttpServer())
      .post("/api/articles")
      .set("Authorization", `Token ${tokenA}`)
      .send({
        article: {
          title: "Dragons",
          description: "About dragons",
          body: "Full body",
          tagList: ["tag1", "tag2"],
        },
      })
      .expect(201)

    const slug = createRes.body.article.slug as string
    expect(createRes.body.article).toMatchObject({
      title: "Dragons",
      body: "Full body",
      tagList: ["tag1", "tag2"],
      author: { username: "alice", bio: null, image: null, following: false },
    })

    const listRes = await request(app.getHttpServer()).get("/api/articles?tag=tag1").expect(200)
    expect(listRes.body.articlesCount).toBe(1)
    expect(listRes.body.articles[0]).not.toHaveProperty("body")

    const singleRes = await request(app.getHttpServer()).get(`/api/articles/${slug}`).expect(200)
    expect(singleRes.body.article.body).toBe("Full body")

    const tagsRes = await request(app.getHttpServer()).get("/api/tags").expect(200)
    expect(tagsRes.body.tags).toEqual(["tag1", "tag2"])

    // Partial update preserves tagList
    const updRes1 = await request(app.getHttpServer())
      .put(`/api/articles/${slug}`)
      .set("Authorization", `Token ${tokenA}`)
      .send({ article: { body: "Updated body" } })
      .expect(200)
    expect(updRes1.body.article.tagList).toEqual(["tag1", "tag2"])

    // Empty array clears tagList
    const updRes2 = await request(app.getHttpServer())
      .put(`/api/articles/${slug}`)
      .set("Authorization", `Token ${tokenA}`)
      .send({ article: { tagList: [] } })
      .expect(200)
    expect(updRes2.body.article.tagList).toEqual([])

    // null tagList rejected with 422
    await request(app.getHttpServer())
      .put(`/api/articles/${slug}`)
      .set("Authorization", `Token ${tokenA}`)
      .send({ article: { tagList: null } })
      .expect(422)

    await request(app.getHttpServer())
      .delete(`/api/articles/${slug}`)
      .set("Authorization", `Token ${tokenA}`)
      .expect(204)

    await request(app.getHttpServer())
      .get(`/api/articles/${slug}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { article: ["not found"] } })
      })
  })

  it("supports comments, favorites with X-Favorites-Version, feed route ordering, and causal headers", async () => {
    const tokenA = await seedUser("usr-a", "alice")
    const tokenB = await seedUser("usr-b", "bob")

    // Feed requires auth (and must not collide with GET /api/articles/:slug)
    await request(app.getHttpServer())
      .get("/api/articles/feed")
      .expect(401)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { token: ["is missing"] } })
      })

    await request(app.getHttpServer())
      .post("/api/profiles/alice/follow")
      .set("Authorization", `Token ${tokenB}`)
      .expect(200)

    const createRes = await request(app.getHttpServer())
      .post("/api/articles")
      .set("Authorization", `Token ${tokenA}`)
      .send({
        article: { title: "Feed Story", description: "Desc", body: "Body" },
      })
      .expect(201)
    const slug = createRes.body.article.slug as string

    // Feed returns article without body and forwards causal version headers
    const feedRes = await request(app.getHttpServer())
      .get("/api/articles/feed?limit=5&offset=0")
      .set("Authorization", `Token ${tokenB}`)
      .set("X-Follows-Version", "12")
      .set("X-Favorites-Version", "34")
      .expect(200)

    expect(feedRes.body.articlesCount).toBe(1)
    expect(feedRes.body.articles[0]).not.toHaveProperty("body")
    expect(feedRes.body.articles[0].author.following).toBe(true)
    expect(backend.recordedFeedCalls.getFeed).toMatchObject({
      limit: 5,
      offset: 0,
      requestorId: "usr-b",
      minFollowsVersion: 12,
      minFavoritesVersion: 34,
    })

    // Favorite & unfavorite set X-Favorites-Version header
    const favRes = await request(app.getHttpServer())
      .post(`/api/articles/${slug}/favorite`)
      .set("Authorization", `Token ${tokenB}`)
      .expect(200)
    expect(favRes.headers["x-favorites-version"]).toBe("1")
    expect(favRes.body.article.favorited).toBe(true)
    expect(favRes.body.article.favoritesCount).toBe(1)

    const unfavRes = await request(app.getHttpServer())
      .delete(`/api/articles/${slug}/favorite`)
      .set("Authorization", `Token ${tokenB}`)
      .expect(200)
    expect(unfavRes.headers["x-favorites-version"]).toBe("2")
    expect(unfavRes.body.article.favorited).toBe(false)

    // Comments CRUD
    const cmtRes = await request(app.getHttpServer())
      .post(`/api/articles/${slug}/comments`)
      .set("Authorization", `Token ${tokenA}`)
      .send({ comment: { body: "First!" } })
      .expect(201)
    const commentId = cmtRes.body.comment.id as number

    await request(app.getHttpServer())
      .get(`/api/articles/${slug}/comments`)
      .set("X-Follows-Version", "7")
      .expect(200)
      .expect((res) => {
        expect(res.body.comments).toHaveLength(1)
        expect(res.body.comments[0].body).toBe("First!")
      })
    expect(backend.recordedFeedCalls.getComments?.minFollowsVersion).toBe(7)

    // Authorization 403 checks
    await request(app.getHttpServer())
      .delete(`/api/articles/${slug}/comments/${commentId}`)
      .set("Authorization", `Token ${tokenB}`)
      .expect(403)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { comment: ["forbidden"] } })
      })

    await request(app.getHttpServer())
      .put(`/api/articles/${slug}`)
      .set("Authorization", `Token ${tokenB}`)
      .send({ article: { body: "Hijack" } })
      .expect(403)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { article: ["forbidden"] } })
      })

    // Non-existent comment 404
    await request(app.getHttpServer())
      .delete(`/api/articles/${slug}/comments/99999`)
      .set("Authorization", `Token ${tokenA}`)
      .expect(404)
      .expect((res) => {
        expect(res.body).toEqual({ errors: { comment: ["not found"] } })
      })

    await request(app.getHttpServer())
      .delete(`/api/articles/${slug}/comments/${commentId}`)
      .set("Authorization", `Token ${tokenA}`)
      .expect(204)
  })

  it("validates article and comment payloads and strips wrapper prefixes", async () => {
    const token = await seedUser("usr-a", "alice")

    await request(app.getHttpServer())
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({ article: { title: "", description: "d", body: "b" } })
      .expect(422)
      .expect((res) => {
        expect(res.body.errors.title[0]).toBe("can't be blank")
      })

    const created = await request(app.getHttpServer())
      .post("/api/articles")
      .set("Authorization", `Token ${token}`)
      .send({ article: { title: "Valid", description: "d", body: "b" } })
      .expect(201)

    await request(app.getHttpServer())
      .post(`/api/articles/${created.body.article.slug}/comments`)
      .set("Authorization", `Token ${token}`)
      .send({ comment: { body: "" } })
      .expect(422)
      .expect((res) => {
        expect(res.body.errors.body[0]).toBe("can't be blank")
      })
  })

  it("supports slugs longer than 100 characters without 414 on favorite, unfavorite, and article reads", async () => {
    const tokenA = await seedUser("usr-a", "alice")
    const tokenB = await seedUser("usr-b", "bob")
    const longTitle =
      "This Is A Very Long Article Title Exceeding One Hundred Characters Once Slugified With Its Random Suffix"

    const created = await request(app.getHttpServer())
      .post("/api/articles")
      .set("Authorization", `Token ${tokenA}`)
      .send({
        article: { title: longTitle, description: "Desc", body: "Body" },
      })
      .expect(201)

    const longSlug = created.body.article.slug as string
    expect(longSlug.length).toBeGreaterThan(100)

    const favRes = await request(app.getHttpServer())
      .post(`/api/articles/${longSlug}/favorite`)
      .set("Authorization", `Token ${tokenB}`)
      .expect(200)
    expect(favRes.headers["x-favorites-version"]).toBe("1")
    expect(favRes.body.article.favorited).toBe(true)

    const getRes = await request(app.getHttpServer())
      .get(`/api/articles/${longSlug}`)
      .set("Authorization", `Token ${tokenB}`)
      .set("X-Favorites-Version", "1")
      .expect(200)
    expect(getRes.body.article.favorited).toBe(true)
    expect(backend.recordedFeedCalls.getArticle?.minFavoritesVersion).toBe(1)

    const unfavRes = await request(app.getHttpServer())
      .delete(`/api/articles/${longSlug}/favorite`)
      .set("Authorization", `Token ${tokenB}`)
      .expect(200)
    expect(unfavRes.headers["x-favorites-version"]).toBe("2")
    expect(unfavRes.body.article.favorited).toBe(false)
  })
})
