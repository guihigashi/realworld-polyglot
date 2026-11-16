import { Inject, Injectable } from "@nestjs/common"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"
import type { CreateArticleInput, HydratedArticle } from "@/domain/article/entities/article.types.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"

@Injectable()
export class CreateArticleUseCase {
  constructor(
    @Inject(ARTICLE_SERVICE)
    private readonly articleService: ArticleService,
    @Inject(SOCIAL_GRAPH_SERVICE)
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async execute(payload: CreateArticleInput, authorId: string): Promise<HydratedArticle> {
    const { authorId: createdAuthorId, ...article } = await this.articleService.createArticle(payload, authorId)
    const targetAuthorId = createdAuthorId || authorId
    const profiles = await this.socialGraphService.getProfilesByIds([targetAuthorId], authorId)
    const author = profiles[targetAuthorId]?.toJSON() ?? null

    return {
      ...article,
      author,
    }
  }
}
