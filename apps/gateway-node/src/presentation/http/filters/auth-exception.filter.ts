import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from "@nestjs/common"
import type { ServerResponse } from "node:http"
import {
  DuplicateUserFieldException,
  InvalidCredentialsException,
  UserNotFoundException,
} from "@/domain/auth/exceptions/auth.exceptions.js"

@Catch(DuplicateUserFieldException, InvalidCredentialsException, UserNotFoundException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(
    exception: DuplicateUserFieldException | InvalidCredentialsException | UserNotFoundException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<ServerResponse>()

    let status: number
    let body: unknown

    if (exception instanceof DuplicateUserFieldException) {
      status = HttpStatus.CONFLICT
      body = { errors: { [exception.field]: ["has already been taken"] } }
    } else if (exception instanceof InvalidCredentialsException) {
      status = HttpStatus.UNAUTHORIZED
      body = { errors: { credentials: ["invalid"] } }
    } else {
      status = HttpStatus.NOT_FOUND
      body = { message: "User not found" }
    }

    const payload = JSON.stringify(body)
    response.statusCode = status
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    response.end(payload)
  }
}
