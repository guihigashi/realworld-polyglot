import { createFileRoute } from "@tanstack/react-router"
import { api } from "../../../state/api.ts"
import ArticlePreview from "../../../components/article-preview.tsx"

export const Route = createFileRoute("/profile/$username/")({
  component: MyArticles,
})

function MyArticles() {
  const { username } = Route.useParams()
  const { data } = api.useListArticlesQuery({ author: username })

  return (
    <>
      {data?.articles.map((a) => (
        <ArticlePreview key={a.slug} article={a} />
      ))}

      <ul className="pagination">
        <li className="page-item active">
          <a className="page-link" href="">
            1
          </a>
        </li>
        <li className="page-item">
          <a className="page-link" href="">
            2
          </a>
        </li>
      </ul>
    </>
  )
}
