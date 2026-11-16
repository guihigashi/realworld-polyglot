import { Inject, Injectable } from "@nestjs/common"
import type { ConfigType } from "@nestjs/config"
import { jwtVerify, SignJWT } from "jose"
import { authConfig } from "@/config/configuration.js"
import type { JwtDecoder, JwtPayload } from "@/domain/auth/contracts/jwt-decoder.js"
import type { JwtGenerator } from "@/domain/auth/contracts/jwt-generator.js"
import type { User } from "@/domain/auth/entities/user.entity.js"

@Injectable()
export class JoseJwtProvider implements JwtGenerator, JwtDecoder {
  constructor(
    @Inject(authConfig.KEY)
    private readonly authCfg: ConfigType<typeof authConfig>,
  ) {}

  async generateForUser(user: User): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const thirtyDaysSeconds = 60 * 60 * 24 * 30

    return new SignJWT({
      email: user.getEmail(),
      username: user.getUsername(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer("identity-gateway")
      .setSubject(user.getId())
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + thirtyDaysSeconds)
      .sign(this.authCfg.jwtSecret)
  }

  async decode(token: string): Promise<JwtPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.authCfg.jwtSecret, {
        algorithms: ["HS256"],
      })

      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        return null
      }

      return {
        sub: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        username: typeof payload.username === "string" ? payload.username : undefined,
        iss: payload.iss,
        iat: payload.iat,
        exp: payload.exp,
      }
    } catch {
      return null
    }
  }
}
