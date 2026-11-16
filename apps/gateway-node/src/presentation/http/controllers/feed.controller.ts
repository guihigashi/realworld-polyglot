import { Controller, Get, Headers, Query, UseGuards } from "@nestjs/common"
import { GetFeedUseCase } from "@/application/feed/use-cases/get-feed.use-case.js"
import type { HydratedArticleSummary } from "@/domain/article/entities/article.types.js"
import { CurrentUserId } from "@/presentation/http/decorators/current-user.decorator.js"
import { parseNonNegativeInt, parseOptionalVersionHeader } from "@/presentation/http/dto/article.dto.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"

@Controller("articles/feed")
export class FeedController {
  constructor(private readonly getFeed: GetFeedUseCase) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async index(
    @CurrentUserId() requestorId: string,
    @Query("limit") rawLimit?: string,
    @Query("offset") rawOffset?: string,
    @Headers("x-follows-version") rawFollowsVersion?: string,
    @Headers("x-favorites-version") rawFavoritesVersion?: string,
  ): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }> {
    return this.getFeed.execute({
      limit: parseNonNegativeInt(rawLimit, 20),
      offset: parseNonNegativeInt(rawOffset, 0),
      requestorId,
      minFollowsVersion: parseOptionalVersionHeader(rawFollowsVersion),
      minFavoritesVersion: parseOptionalVersionHeader(rawFavoritesVersion),
    })
  }
}
