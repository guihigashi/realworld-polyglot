import { Inject, Injectable } from "@nestjs/common"
import type { HydratedComment } from "@/domain/article/entities/article.types.js"
import { FEED_SERVICE, type FeedService, type GetFeedCommentsParams } from "@/domain/feed/contracts/feed.service.js"

@Injectable()
export class GetCommentsUseCase {
  constructor(
    @Inject(FEED_SERVICE)
    private readonly feedService: FeedService,
  ) {}

  async execute(params: GetFeedCommentsParams): Promise<HydratedComment[]> {
    return this.feedService.getComments(params)
  }
}
