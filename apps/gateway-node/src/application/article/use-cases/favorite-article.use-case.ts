import { Inject, Injectable } from "@nestjs/common"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"
import type { FavoriteArticleResult } from "@/domain/article/entities/article.types.js"
import { SOCIAL_GRAPH_SERVICE, type SocialGraphService } from "@/domain/profile/contracts/social-graph.service.js"

@Injectable()
export class FavoriteArticleUseCase {
  constructor(
    @Inject(ARTICLE_SERVICE)
    private readonly articleService: ArticleService,
    @Inject(SOCIAL_GRAPH_SERVICE)
    private readonly socialGraphService: SocialGraphService,
  ) {}

  async execute(slug: string, requestorId: string): Promise<FavoriteArticleResult> {
    const result = await this.articleService.favoriteArticle(slug, requestorId)
    const { authorId, ...article } = result.article

    let author = null
    if (authorId) {
      const profiles = await this.socialGraphService.getProfilesByIds([authorId], requestorId)
      author = profiles[authorId]?.toJSON() ?? null
    }

    return {
      article: {
        ...article,
        author,
      },
      favoritesVersion: result.favoritesVersion,
    }
  }
}
