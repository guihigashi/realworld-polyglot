import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { api } from "../../state/api.ts"
import Pagination from "../../components/pagination.tsx"
import { getLimitOffset } from "../../utils/pagination.ts"
import ArticlePreviewList from "../../components/article-preview-list.tsx"
import { isDefined } from "../../utils/object.ts"

const searchSchema = z.object({
  feed: z.literal("following").optional(),
  page: z.number().int().positive().optional(),
})

export const Route = createFileRoute("/_home/")({
  component: Index,
  validateSearch: searchSchema,
})

function Index() {
  const { feed } = Route.useSearch()
  const isYourFeed = feed === "following"

  if (isYourFeed) {
    return <YourFeed />
  } else {
    return <GlobalFeed />
  }
}

function YourFeed() {
  const { page } = Route.useSearch()
  const { data } = api.useFeedArticlesQuery(getLimitOffset(page))

  if (!isDefined(data)) {
    return null
  }

  return (
    <>
      <ArticlePreviewList articles={data.articles} isFollowingFeed />

      <Pagination total={data.articlesCount} />
    </>
  )
}

function GlobalFeed() {
  const { page } = Route.useSearch()
  const { data } = api.useListArticlesQuery(getLimitOffset(page))

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
