import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common"
import type { IncomingMessage } from "node:http"
import { JWT_DECODER, type JwtDecoder } from "@/domain/auth/contracts/jwt-decoder.js"

export interface AuthenticatedRequest extends IncomingMessage {
  authUserId?: string
}

export async function resolveAuthUserId(
  request: AuthenticatedRequest,
  jwtDecoder: JwtDecoder,
): Promise<{ userId: string | null; errors: Record<string, string[]> | null }> {
  const header = request.headers.authorization
  if (!header) {
    return { userId: null, errors: { token: ["is missing"] } }
  }

  const match = /^(Token|Bearer)\s+(.+)$/i.exec(header)
  if (!match) {
    return { userId: null, errors: { token: ["has invalid format"] } }
  }

  const payload = await jwtDecoder.decode(match[2].trim())
  if (!payload) {
    return { userId: null, errors: { token: ["is invalid or expired"] } }
  }

  return { userId: payload.sub, errors: null }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JWT_DECODER)
    private readonly jwtDecoder: JwtDecoder,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const { userId, errors } = await resolveAuthUserId(request, this.jwtDecoder)

    if (!userId) {
      throw new UnauthorizedException({ errors: errors ?? { token: ["is missing"] } })
    }

    request.authUserId = userId
    return true
  }
}
