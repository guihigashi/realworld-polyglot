import { Inject, Injectable } from "@nestjs/common"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"
import type { HydratedArticle, UpdateArticleInput } from "@/domain/article/entities/article.types.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"

@Injectable()
export class UpdateArticleUseCase {
  constructor(
    @Inject(ARTICLE_SERVICE)
    private readonly articleService: ArticleService,
    @Inject(SOCIAL_GRAPH_SERVICE)
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async execute(slug: string, payload: UpdateArticleInput, authorId: string): Promise<HydratedArticle> {
    const { authorId: updatedAuthorId, ...article } = await this.articleService.updateArticle(slug, payload, authorId)
    const targetAuthorId = updatedAuthorId || authorId
    const profiles = await this.socialGraphService.getProfilesByIds([targetAuthorId], authorId)
    const author = profiles[targetAuthorId]?.toJSON() ?? null

    return {
      ...article,
      author,
    }
  }
}
