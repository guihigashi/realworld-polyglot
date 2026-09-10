import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react"
import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

export function isFetchBaseQueryError(e: unknown): e is FetchBaseQueryError {
  return typeof e === "object" && e !== null && "status" in e
}

function isLaravelError(e: unknown): e is LaravelError {
  return typeof e === "object" && e !== null && "status" in e
}

export function handleFormError<F extends FieldValues>(
  e: unknown,
  setError: UseFormSetError<F>,
  transformKey: (s: string) => string = (s) => s,
) {
  if (!isLaravelError(e)) {
    return
  }

  if (e.status === 401) {
    setError("root", { message: "Invalid credentials" })
  }

  const errors = e.data.errors
  for (const [key, value] of Object.entries(errors)) {
    setError(transformKey(key) as Path<F>, { message: value.join(",") })
  }
}
