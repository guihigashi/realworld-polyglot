import { Inject, Injectable } from "@nestjs/common"
import { FEED_SERVICE, type FeedService } from "@/domain/feed/contracts/feed.service.js"

@Injectable()
export class GetTagsUseCase {
  constructor(
    @Inject(FEED_SERVICE)
    private readonly feedService: FeedService,
  ) {}

  async execute(): Promise<string[]> {
    return this.feedService.getTags()
  }
}
