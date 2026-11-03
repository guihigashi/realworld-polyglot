import { createFileRoute } from "@tanstack/react-router"
import { api } from "@/state/api.ts"
import { getLimitOffset } from "@/utils/pagination.ts"
import Pagination from "@/components/pagination.tsx"
import { z } from "zod"
import { isDefined } from "@/utils/object.ts"
import ArticlePreviewList from "@/components/article-preview-list.tsx"

const searchSchema = z.object({
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute("/profile/$username/")({
  component: MyArticles,
  validateSearch: searchSchema,
})

function MyArticles() {
  const { username } = Route.useParams()
  const { page } = Route.useSearch()
  const { data } = api.useListArticlesQuery({
    author: username,
    ...getLimitOffset(page),
  })

  if (!isDefined(data)) {
    return null
  }

  return (
    <>
      <ArticlePreviewList articles={data.articles} />

      <Pagination total={data.articlesCount} />
    </>
  )
}
