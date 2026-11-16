import { createParamDecorator, type ExecutionContext } from "@nestjs/common"
import type { AuthenticatedRequest } from "@/presentation/http/guards/jwt-auth.guard.js"

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
  return request.authUserId
})
