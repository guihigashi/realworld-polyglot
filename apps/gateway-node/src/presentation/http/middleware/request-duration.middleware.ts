import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { IncomingMessage, ServerResponse } from "node:http"

@Injectable()
export class RequestDurationMiddleware implements NestMiddleware {
  use(_req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const start = performance.now()
    const originalWriteHead = res.writeHead.bind(res)

    res.writeHead = ((statusCode: number, ...args: unknown[]) => {
      if (!res.headersSent) {
        const durationMs = performance.now() - start
        res.setHeader("x-request-duration", `${durationMs.toFixed(2)}ms`)
      }
      return (originalWriteHead as (...params: unknown[]) => ServerResponse)(statusCode, ...args)
    }) as ServerResponse["writeHead"]

    next()
  }
}
