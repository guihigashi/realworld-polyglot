import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common"
import { JWT_DECODER, type JwtDecoder } from "@/domain/auth/contracts/jwt-decoder.js"
import { type AuthenticatedRequest, resolveAuthUserId } from "@/presentation/http/guards/jwt-auth.guard.js"

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_DECODER)
    private readonly jwtDecoder: JwtDecoder,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const { userId } = await resolveAuthUserId(request, this.jwtDecoder)

    if (userId) {
      request.authUserId = userId
    }

    return true
  }
}
