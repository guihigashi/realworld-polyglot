import { Body, Controller, Get, Put, UseFilters, UseGuards, UsePipes } from "@nestjs/common"
import { GetCurrentUserUseCase } from "@/application/auth/use-cases/get-current-user.use-case.js"
import { UpdateUserUseCase } from "@/application/auth/use-cases/update-user.use-case.js"
import type { UserResponse } from "@/application/auth/use-cases/user-response.js"
import { CurrentUserId } from "@/presentation/http/decorators/current-user.decorator.js"
import { type UpdateUserDto, updateUserSchema } from "@/presentation/http/dto/auth.dto.js"
import { AuthExceptionFilter } from "@/presentation/http/filters/auth-exception.filter.js"
import { JwtAuthGuard } from "@/presentation/http/guards/jwt-auth.guard.js"
import { ZodValidationPipe } from "@/presentation/http/pipes/zod-validation.pipe.js"

@Controller("user")
@UseGuards(JwtAuthGuard)
@UseFilters(AuthExceptionFilter)
export class UserController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
  ) {}

  @Get()
  async show(@CurrentUserId() userId: string): Promise<{ user: UserResponse }> {
    const user = await this.getCurrentUser.execute(userId)
    return { user }
  }

  @Put()
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  async update(@CurrentUserId() userId: string, @Body() body: UpdateUserDto): Promise<{ user: UserResponse }> {
    const user = await this.updateUser.execute(userId, body.user)
    return { user }
  }
}
