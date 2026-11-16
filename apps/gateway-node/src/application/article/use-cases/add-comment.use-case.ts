import { Inject, Injectable } from "@nestjs/common"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"
import type { HydratedComment } from "@/domain/article/entities/article.types.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"

@Injectable()
export class AddCommentUseCase {
  constructor(
    @Inject(ARTICLE_SERVICE)
    private readonly articleService: ArticleService,
    @Inject(SOCIAL_GRAPH_SERVICE)
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async execute(slug: string, body: string, authorId: string): Promise<HydratedComment> {
    const { authorId: commentAuthorId, ...comment } = await this.articleService.addComment(slug, body, authorId)
    const targetAuthorId = commentAuthorId || authorId
    const profiles = await this.socialGraphService.getProfilesByIds([targetAuthorId], authorId)
    const author = profiles[targetAuthorId]?.toJSON() ?? null

    return {
      ...comment,
      author,
    }
  }
}
