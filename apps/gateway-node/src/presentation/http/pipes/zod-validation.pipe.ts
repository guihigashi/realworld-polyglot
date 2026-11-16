import { type ArgumentMetadata, type PipeTransform, UnprocessableEntityException } from "@nestjs/common"
import type { z } from "zod"

export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<unknown, z.infer<TSchema>> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): z.infer<TSchema> {
    if (metadata.type !== "body") {
      return value as z.infer<TSchema>
    }

    const result = this.schema.safeParse(value)
    if (result.success) {
      return result.data
    }

    const errors: Record<string, string[]> = {}
    for (const issue of result.error.issues) {
      const cleanPath = issue.path
        .map(String)
        .filter((segment, index) => !(index === 0 && segment === "user"))
        .join(".")
      const key = cleanPath || "body"
      if (!errors[key]) {
        errors[key] = []
      }
      errors[key].push(issue.message)
    }

    throw new UnprocessableEntityException({ errors })
  }
}
