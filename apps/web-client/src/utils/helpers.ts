import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"

export function isFetchBaseQueryError(e: unknown): e is FetchBaseQueryError {
  return typeof e === "object" && e !== null && "status" in e
}
