import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters, UsePipes } from "@nestjs/common"
import { LoginUserUseCase } from "@/application/auth/use-cases/login-user.use-case.js"
import { RegisterUserUseCase } from "@/application/auth/use-cases/register-user.use-case.js"
import type { UserResponse } from "@/application/auth/use-cases/user-response.js"
import {
  type LoginUserDto,
  loginUserSchema,
  type RegisterUserDto,
  registerUserSchema,
} from "@/presentation/http/dto/auth.dto.js"
import { AuthExceptionFilter } from "@/presentation/http/filters/auth-exception.filter.js"
import { ZodValidationPipe } from "@/presentation/http/pipes/zod-validation.pipe.js"

@Controller("users")
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    private readonly loginUser: LoginUserUseCase,
    private readonly registerUser: RegisterUserUseCase,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginUserSchema))
  async login(@Body() body: LoginUserDto): Promise<{ user: UserResponse }> {
    const user = await this.loginUser.execute({
      email: body.user.email,
      password: body.user.password,
    })
    return { user }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerUserSchema))
  async register(@Body() body: RegisterUserDto): Promise<{ user: UserResponse }> {
    const user = await this.registerUser.execute({
      username: body.user.username,
      email: body.user.email,
      password: body.user.password,
    })
    return { user }
  }
}
