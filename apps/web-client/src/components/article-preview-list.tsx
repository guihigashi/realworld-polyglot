import ArticlePreview from "./article-preview.tsx"
import { Link } from "@tanstack/react-router"

type ArticlePreviewListProps = {
  articles: ArticleSummary[]
  isFollowingFeed?: boolean
}
export default function ArticlePreviewList({ articles, isFollowingFeed }: ArticlePreviewListProps) {
  if (articles.length === 0) {
    return (
      <div className="article-preview">
        {isFollowingFeed ? (
          <div className="empty-feed-message">
            Your feed is empty. Follow some users to see their articles here, or check out the{" "}
            <Link to="/" resetScroll={false}>
              Global Feed
            </Link>
            !
          </div>
        ) : (
          <div className="empty-feed-message">No articles here... yet.</div>
        )}
      </div>
    )
  }

  return (
    <>
      {articles.map((a) => (
        <ArticlePreview key={a.slug} article={a} />
      ))}
    </>
  )
}
