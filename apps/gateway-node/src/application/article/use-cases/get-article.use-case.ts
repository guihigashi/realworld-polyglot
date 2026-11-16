import { Inject, Injectable } from "@nestjs/common"
import type { HydratedArticle } from "@/domain/article/entities/article.types.js"
import { FEED_SERVICE, type FeedService, type GetFeedArticleParams } from "@/domain/feed/contracts/feed.service.js"

@Injectable()
export class GetArticleUseCase {
  constructor(
    @Inject(FEED_SERVICE)
    private readonly feedService: FeedService,
  ) {}

  async execute(params: GetFeedArticleParams): Promise<HydratedArticle> {
    return this.feedService.getArticle(params)
  }
}
