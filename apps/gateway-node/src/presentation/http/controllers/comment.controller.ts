import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseFilters,
  UseGuards,
  UsePipes,
} from "@nestjs/common"
import { AddCommentUseCase } from "@/application/article/use-cases/add-comment.use-case.js"
import { DeleteCommentUseCase } from "@/application/article/use-cases/delete-comment.use-case.js"
import { GetCommentsUseCase } from "@/application/article/use-cases/get-comments.use-case.js"
import type { HydratedComment } from "@/domain/article/entities/article.types.js"
import { CurrentUserId } from "@/presentation/http/decorators/current-user.decorator.js"
import {
  type AddCommentDto,
  addCommentSchema,
  parseOptionalVersionHeader,
} from "@/presentation/http/dto/article.dto.js"
import { ArticleExceptionFilter } from "@/presentation/http/filters/article-exception.filter.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"
import { OptionalJwtAuthGuard } from "@/presentation/http/guards/optional-jwt-auth.guard.js"
import { ZodValidationPipe } from "@/presentation/http/pipes/zod-validation.pipe.js"

@Controller("articles/:slug/comments")
@UseFilters(ArticleExceptionFilter)
export class CommentController {
  constructor(
    private readonly addComment: AddCommentUseCase,
    private readonly getComments: GetCommentsUseCase,
    private readonly deleteComment: DeleteCommentUseCase,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async index(
    @Param("slug") slug: string,
    @CurrentUserId() requestorId?: string,
    @Headers("x-follows-version") rawFollowsVersion?: string,
  ): Promise<{ comments: HydratedComment[] }> {
    const comments = await this.getComments.execute({
      slug,
      requestorId: requestorId ?? null,
      minFollowsVersion: parseOptionalVersionHeader(rawFollowsVersion),
    })
    return { comments }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(addCommentSchema))
  async store(
    @CurrentUserId() requestorId: string,
    @Param("slug") slug: string,
    @Body() body: AddCommentDto,
  ): Promise<{ comment: HydratedComment }> {
    const comment = await this.addComment.execute(slug, body.comment.body, requestorId)
    return { comment }
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(
    @CurrentUserId() requestorId: string,
    @Param("slug") slug: string,
    @Param("id", ParseIntPipe) id: number,
  ): Promise<void> {
    await this.deleteComment.execute(slug, id, requestorId)
  }
}
