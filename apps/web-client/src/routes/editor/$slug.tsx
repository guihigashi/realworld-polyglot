import { createFileRoute, redirect } from "@tanstack/react-router"
import { store } from "../../state/store.ts"
import { api } from "../../state/api.ts"
import ArticleForm from "./-article-form.tsx"

export const Route = createFileRoute("/editor/$slug")({
  component: EditArticle,
  beforeLoad: ({ context }) => {
    if (context.auth.status !== "authenticated") {
      throw redirect({ to: "/" })
    }
    return { user: context.auth.user }
  },
  loader: async ({ context, params }) => {
    const { article } = await store.dispatch(api.endpoints.getArticle.initiate(params.slug)).unwrap()

    if (article.author.username !== context.user.username) {
      throw redirect({ to: "/" })
    }

    return article
  },
})

function EditArticle() {
  const article = Route.useLoaderData()

  return <ArticleForm article={article} />
}
