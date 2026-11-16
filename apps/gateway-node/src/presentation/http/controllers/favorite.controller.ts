import { Controller, Delete, HttpCode, HttpStatus, Param, Post, Res, UseFilters, UseGuards } from "@nestjs/common"
import type { ServerResponse } from "node:http"
import { FavoriteArticleUseCase } from "@/application/article/use-cases/favorite-article.use-case.js"
import { UnfavoriteArticleUseCase } from "@/application/article/use-cases/unfavorite-article.use-case.js"
import type { HydratedArticle } from "@/domain/article/entities/article.types.js"
import { CurrentUserId } from "@/presentation/http/decorators/current-user.decorator.js"
import { ArticleExceptionFilter } from "@/presentation/http/filters/article-exception.filter.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"

@Controller("articles/:slug/favorite")
@UseGuards(JwtAuthGuard)
@UseFilters(ArticleExceptionFilter)
export class FavoriteController {
  constructor(
    private readonly favoriteArticle: FavoriteArticleUseCase,
    private readonly unfavoriteArticle: UnfavoriteArticleUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async store(
    @CurrentUserId() requestorId: string,
    @Param("slug") slug: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ article: HydratedArticle }> {
    const result = await this.favoriteArticle.execute(slug, requestorId)
    res.setHeader("X-Favorites-Version", String(result.favoritesVersion))
    return { article: result.article }
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async destroy(
    @CurrentUserId() requestorId: string,
    @Param("slug") slug: string,
    @Res({ passthrough: true }) res: ServerResponse,
  ): Promise<{ article: HydratedArticle }> {
    const result = await this.unfavoriteArticle.execute(slug, requestorId)
    res.setHeader("X-Favorites-Version", String(result.favoritesVersion))
    return { article: result.article }
  }
}
