import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from "@nestjs/common"
import type { ServerResponse } from "node:http"
import { ProfileNotFoundException } from "@/domain/profile/exceptions/profile.exceptions.js"

@Catch(ProfileNotFoundException)
export class ProfileExceptionFilter implements ExceptionFilter {
  catch(_exception: ProfileNotFoundException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ServerResponse>()

    const payload = JSON.stringify({ errors: { profile: ["not found"] } })
    response.statusCode = HttpStatus.NOT_FOUND
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    response.end(payload)
  }
}
