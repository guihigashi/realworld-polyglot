import { Inject, Injectable } from "@nestjs/common"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"

@Injectable()
export class DeleteCommentUseCase {
  constructor(
    @Inject(ARTICLE_SERVICE)
    private readonly articleService: ArticleService,
  ) {}

  async execute(slug: string, id: number, requestorId: string): Promise<void> {
    await this.articleService.deleteComment(slug, id, requestorId)
  }
}
