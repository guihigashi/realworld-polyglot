import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { api } from "../state/api.ts"
import { z } from "zod"
import ArticlePreview from "../components/article-preview.tsx"
import { useState } from "react"
import { clsx } from "clsx"
import { isDefined } from "../utils/object.ts"

const searchSchema = z.object({
  tag: z.string().optional(),
  author: z.string().optional(),
  favorited: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export const Route = createFileRoute("/")({
  component: Index,
  validateSearch: searchSchema,
})

function Index() {
  const { tag } = Route.useSearch()

  const navigate = useNavigate({ from: Route.to })

  const { data: tags } = api.useGetTagsQuery()

  type Tabs = "feed" | "global"
  const [selectedTab, setSelectedTab] = useState<Tabs>("global")

  const activateTabIf = (s: Tabs) => !isDefined(tag) && selectedTab === s && "active"

  return (
    <div className="home-page">
      <div className="banner">
        <div className="container">
          <h1 className="logo-font">conduit</h1>
          <p>A place to share your knowledge.</p>
        </div>
      </div>

      <div className="container page">
        <div className="row">
          <div className="col-md-9">
            <div className="feed-toggle">
              <ul className="nav nav-pills outline-active">
                <li className="nav-item">
                  <a
                    className={clsx("nav-link", activateTabIf("feed"))}
                    href="#"
                    onClick={async (event) => {
                      event.preventDefault()
                      setSelectedTab("feed")
                      await navigate({
                        search: (prev) => ({
                          ...prev,
                          tag: undefined,
                        }),
                      })
                    }}
                  >
                    Your Feed
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={clsx("nav-link", activateTabIf("global"))}
                    href="#"
                    onClick={async (event) => {
                      event.preventDefault()
                      setSelectedTab("global")
                      await navigate({
                        search: (prev) => ({
                          ...prev,
                          tag: undefined,
                        }),
                      })
                    }}
                  >
                    Global Feed
                  </a>
                </li>
                {isDefined(tag) ? (
                  <li className="nav-item">
                    <Link className="nav-link active" to={Route.to} search={{ tag }}>
                      {tag}
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>

            {selectedTab === "feed" ? <YourFeed /> : <GlobalFeed />}

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
          </div>

          <div className="col-md-3">
            <div className="sidebar">
              <p>Popular Tags</p>

              <div className="tag-list">
                {tags?.tags.map((tag) => (
                  <Link key={tag} to={Route.to} search={{ tag }} className="tag-pill tag-default">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function YourFeed() {
  const params = Route.useSearch()

  const { data: feedData } = api.useFeedArticlesQuery(params)

  return (
    <>
      {feedData?.articles.map((a) => (
        <ArticlePreview key={a.slug} article={a} />
      ))}
    </>
  )
}

function GlobalFeed() {
  const params = Route.useSearch()

  const { data: feedData } = api.useListArticlesQuery(params)

  return (
    <>
      {feedData?.articles.map((a) => (
        <ArticlePreview key={a.slug} article={a} />
      ))}
    </>
  )
}
