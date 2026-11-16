import { Controller, Get, UseGuards } from "@nestjs/common"
import { GetTagsUseCase } from "@/application/article/use-cases/get-tags.use-case.js"
import { OptionalJwtAuthGuard } from "@/presentation/http/guards/optional-jwt-auth.guard.js"

@Controller("tags")
export class TagController {
  constructor(private readonly getTags: GetTagsUseCase) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async index(): Promise<{ tags: string[] }> {
    const tags = await this.getTags.execute()
    return { tags }
  }
}
