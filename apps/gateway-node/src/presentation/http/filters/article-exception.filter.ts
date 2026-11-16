import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus } from "@nestjs/common"
import type { ServerResponse } from "node:http"
import {
  ArticleNotFoundException,
  CommentNotFoundException,
  ForbiddenException,
} from "@/domain/article/exceptions/article.exceptions.js"

@Catch(ArticleNotFoundException, CommentNotFoundException, ForbiddenException)
export class ArticleExceptionFilter implements ExceptionFilter {
  catch(
    exception: ArticleNotFoundException | CommentNotFoundException | ForbiddenException,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<ServerResponse>()

    let status: number
    let body: unknown

    if (exception instanceof ArticleNotFoundException) {
      status = HttpStatus.NOT_FOUND
      body = { errors: { article: ["not found"] } }
    } else if (exception instanceof CommentNotFoundException) {
      status = HttpStatus.NOT_FOUND
      body = { errors: { comment: ["not found"] } }
    } else {
      status = HttpStatus.FORBIDDEN
      body = { errors: { [exception.entity]: ["forbidden"] } }
    }

    const payload = JSON.stringify(body)
    response.statusCode = status
    response.setHeader("Content-Type", "application/json; charset=utf-8")
    response.end(payload)
  }
}
