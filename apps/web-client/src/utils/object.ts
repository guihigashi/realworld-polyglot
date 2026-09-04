export function removeEmptyValues<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {}

  const keys = Object.keys(obj) as (keyof T)[]

  for (const key of keys) {
    const value = obj[key]
    if (value === null) {
      continue
    }
    if (typeof value === "string" && value.trim() === "") {
      continue
    }

    result[key] = value
  }

  return result
}
