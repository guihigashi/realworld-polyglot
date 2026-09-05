import { createFileRoute, redirect } from "@tanstack/react-router"
import ArticleForm from "./-article-form.tsx"

export const Route = createFileRoute("/editor/")({
  component: CreateArticle,
  beforeLoad: ({ context }) => {
    if (context.auth.status !== "authenticated") {
      throw redirect({ to: "/" })
    }
  },
})

function CreateArticle() {
  return <ArticleForm from={Route.to} />
}
