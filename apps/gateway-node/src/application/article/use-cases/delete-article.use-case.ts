import { Inject, Injectable } from "@nestjs/common"
import { ARTICLE_SERVICE, type ArticleService } from "@/domain/article/contracts/article.service.js"

@Injectable()
export class DeleteArticleUseCase {
  constructor(
    @Inject(ARTICLE_SERVICE)
    private readonly articleService: ArticleService,
  ) {}

  async execute(slug: string, authorId: string): Promise<void> {
    await this.articleService.deleteArticle(slug, authorId)
  }
}
