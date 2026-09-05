import { Link } from "@tanstack/react-router"
import ProfileAvatar from "./profile-avatar.tsx"

export default function ArticlePreview({ article }: { article: ArticleSummary }) {
  return (
    <div key={article.slug} className="article-preview">
      <div className="article-meta">
        <Link to="/profile/$username" params={{ username: article.author.username }}>
          <ProfileAvatar profile={article.author} />
        </Link>
        <div className="info">
          <Link to="/profile/$username" params={{ username: article.author.username }} className="author">
            {article.author.username}
          </Link>
          <span className="date">January 20th</span>
        </div>
        <button className="btn btn-outline-primary btn-sm pull-xs-right">
          <i className="ion-heart"></i> {article.favoritesCount}
        </button>
      </div>
      <Link className="preview-link" to="/article/$slug" params={{ slug: article.slug }}>
        <h1>{article.title}</h1>
        <p>{article.description}</p>
        <span>Read more...</span>
        <ul className="tag-list">
          {article.tagList.map((tag) => (
            <li key={tag} className="tag-default tag-pill tag-outline">
              {tag}
            </li>
          ))}
        </ul>
      </Link>
    </div>
  )
}
