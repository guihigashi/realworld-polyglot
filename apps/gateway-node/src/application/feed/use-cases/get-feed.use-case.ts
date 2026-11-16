import { Inject, Injectable } from "@nestjs/common"
import type { HydratedArticleSummary } from "@/domain/article/entities/article.types.js"
import { FEED_SERVICE, type FeedService, type GetFeedParams } from "@/domain/feed/contracts/feed.service.js"

@Injectable()
export class GetFeedUseCase {
  constructor(
    @Inject(FEED_SERVICE)
    private readonly feedService: FeedService,
  ) {}

  async execute(params: GetFeedParams): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }> {
    return this.feedService.getFeed(params)
  }
}
