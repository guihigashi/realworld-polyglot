import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
  UsePipes,
} from "@nestjs/common"
import { CreateArticleUseCase } from "@/application/article/use-cases/create-article.use-case.js"
import { DeleteArticleUseCase } from "@/application/article/use-cases/delete-article.use-case.js"
import { GetArticleUseCase } from "@/application/article/use-cases/get-article.use-case.js"
import { ListArticlesUseCase } from "@/application/article/use-cases/list-articles.use-case.js"
import { UpdateArticleUseCase } from "@/application/article/use-cases/update-article.use-case.js"
import type { HydratedArticle, HydratedArticleSummary } from "@/domain/article/entities/article.types.js"
import { CurrentUserId } from "@/presentation/http/decorators/current-user.decorator.js"
import {
  type CreateArticleDto,
  createArticleSchema,
  parseNonNegativeInt,
  parseOptionalVersionHeader,
  type UpdateArticleDto,
  updateArticleSchema,
} from "@/presentation/http/dto/article.dto.js"
import { ArticleExceptionFilter } from "@/presentation/http/filters/article-exception.filter.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"
import { OptionalJwtAuthGuard } from "@/presentation/http/guards/optional-jwt-auth.guard.js"
import { ZodValidationPipe } from "@/presentation/http/pipes/zod-validation.pipe.js"

@Controller("articles")
@UseFilters(ArticleExceptionFilter)
export class ArticleController {
  constructor(
    private readonly createArticle: CreateArticleUseCase,
    private readonly updateArticle: UpdateArticleUseCase,
    private readonly getArticle: GetArticleUseCase,
    private readonly listArticles: ListArticlesUseCase,
    private readonly deleteArticle: DeleteArticleUseCase,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async index(
    @CurrentUserId() requestorId?: string,
    @Query("tag") tag?: string,
    @Query("author") author?: string,
    @Query("favorited") favorited?: string,
    @Query("limit") rawLimit?: string,
    @Query("offset") rawOffset?: string,
    @Headers("x-favorites-version") rawFavoritesVersion?: string,
  ): Promise<{ articles: HydratedArticleSummary[]; articlesCount: number }> {
    return this.listArticles.execute({
      tag: tag ?? null,
      author: author ?? null,
      favorited: favorited ?? null,
      limit: parseNonNegativeInt(rawLimit, 20),
      offset: parseNonNegativeInt(rawOffset, 0),
      requestorId: requestorId ?? null,
      minFavoritesVersion: parseOptionalVersionHeader(rawFavoritesVersion),
    })
  }

  @Get(":slug")
  @UseGuards(OptionalJwtAuthGuard)
  async show(
    @Param("slug") slug: string,
    @CurrentUserId() requestorId?: string,
    @Headers("x-favorites-version") rawFavoritesVersion?: string,
    @Headers("x-follows-version") rawFollowsVersion?: string,
  ): Promise<{ article: HydratedArticle }> {
    const article = await this.getArticle.execute({
      slug,
      requestorId: requestorId ?? null,
      minFavoritesVersion: parseOptionalVersionHeader(rawFavoritesVersion),
      minFollowsVersion: parseOptionalVersionHeader(rawFollowsVersion),
    })
    return { article }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createArticleSchema))
  async store(
    @CurrentUserId() authorId: string,
    @Body() body: CreateArticleDto,
  ): Promise<{ article: HydratedArticle }> {
    const article = await this.createArticle.execute(body.article, authorId)
    return { article }
  }

  @Put(":slug")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(updateArticleSchema))
  async update(
    @CurrentUserId() authorId: string,
    @Param("slug") slug: string,
    @Body() body: UpdateArticleDto,
  ): Promise<{ article: HydratedArticle }> {
    const article = await this.updateArticle.execute(slug, body.article, authorId)
    return { article }
  }

  @Delete(":slug")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(@CurrentUserId() authorId: string, @Param("slug") slug: string): Promise<void> {
    await this.deleteArticle.execute(slug, authorId)
  }
}
