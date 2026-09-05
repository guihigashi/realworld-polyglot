import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { store } from "../state/store.ts"
import { api } from "../state/api.ts"
import { useAppSelector } from "../state/hooks.ts"
import ProfileAvatar from "../components/profile-avatar.tsx"
import { clsx } from "clsx"

export const Route = createFileRoute("/article/$slug")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const { article } = await store
      .dispatch(
        api.endpoints.getArticle.initiate(params.slug, {
          forceRefetch: true,
        }),
      )
      .unwrap()

    return article
  },
})

function RouteComponent() {
  const article = Route.useLoaderData()
  const auth = useAppSelector((state) => state.auth)
  const router = useRouter()
  const navigate = useNavigate({ from: Route.to })
  const [deleteArticle] = api.useDeleteArticleMutation()
  const [favoriteArticle] = api.useFavoriteArticleMutation()
  const [unfavoriteArticle] = api.useUnfavoriteArticleMutation()

  return (
    <div className="article-page">
      <div className="banner">
        <div className="container">
          <h1>{article.title}</h1>

          <div className="article-meta">
            <Link to="/profile/$username" params={{ username: article.author.username }}>
              <ProfileAvatar profile={article.author} />
            </Link>
            <div className="info">
              <a href="/profile/eric-simons" className="author">
                Eric Simons
              </a>
              <span className="date">January 20th</span>
            </div>
            <button className="btn btn-sm btn-outline-secondary">
              <i className="ion-plus-round"></i>
              &nbsp; Follow Eric Simons <span className="counter">(10)</span>
            </button>
            &nbsp;&nbsp;
            <button
              className={clsx("btn", "btn-sm", article.favorited ? "btn-primary" : "btn-outline-primary")}
              onClick={async () => {
                try {
                  const result = article.favorited
                    ? await unfavoriteArticle(article.slug).unwrap()
                    : await favoriteArticle(article.slug).unwrap()

                  await router.invalidate()
                } catch (e) {
                  console.error(e)
                }
              }}
            >
              <i className="ion-heart"></i>
              &nbsp; {article.favorited ? "Unfavorite" : "Favorite"} Post{" "}
              <span className="counter">({article.favoritesCount})</span>
            </button>
            {auth.status === "authenticated" && auth.user.username === article.author.username ? (
              <>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() =>
                    navigate({
                      to: "/editor/$slug",
                      params: { slug: article.slug },
                    })
                  }
                >
                  <i className="ion-edit"></i> Edit Article
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={async () => {
                    try {
                      await deleteArticle(article.slug).unwrap()
                      await navigate({ to: "/" })
                    } catch (error) {
                      console.error(error)
                    }
                  }}
                >
                  <i className="ion-trash-a"></i> Delete Article
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container page">
        <div className="row article-content">
          <div className="col-md-12">
            <p>{article.body}</p>
            <ul className="tag-list">
              {article.tagList.map((tag) => (
                <li key={tag} className="tag-default tag-pill tag-outline">
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr />

        <div className="article-actions">
          <div className="article-meta">
            <a href="profile.html">
              <img src="http://i.imgur.com/Qr71crq.jpg" />
            </a>
            <div className="info">
              <a href="" className="author">
                Eric Simons
              </a>
              <span className="date">January 20th</span>
            </div>
            <button className="btn btn-sm btn-outline-secondary">
              <i className="ion-plus-round"></i>
              &nbsp; Follow Eric Simons
            </button>
            &nbsp;
            <button className="btn btn-sm btn-outline-primary">
              <i className="ion-heart"></i>
              &nbsp; Favorite Article <span className="counter">(29)</span>
            </button>
            {auth.status === "authenticated" && auth.user.username === article.author.username ? (
              <>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() =>
                    navigate({
                      to: "/editor/$slug",
                      params: { slug: article.slug },
                    })
                  }
                >
                  <i className="ion-edit"></i> Edit Article
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={async () => {
                    try {
                      await deleteArticle(article.slug).unwrap()
                      await navigate({ to: "/" })
                    } catch (error) {
                      console.error(error)
                    }
                  }}
                >
                  <i className="ion-trash-a"></i> Delete Article
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="row">
          <div className="col-xs-12 col-md-8 offset-md-2">
            <form className="card comment-form">
              <div className="card-block">
                <textarea className="form-control" placeholder="Write a comment..." rows={3}></textarea>
              </div>
              <div className="card-footer">
                <img src="http://i.imgur.com/Qr71crq.jpg" className="comment-author-img" />
                <button className="btn btn-sm btn-primary">Post Comment</button>
              </div>
            </form>

            <div className="card">
              <div className="card-block">
                <p className="card-text">With supporting text below as a natural lead-in to additional content.</p>
              </div>
              <div className="card-footer">
                <a href="/profile/author" className="comment-author">
                  <img src="http://i.imgur.com/Qr71crq.jpg" className="comment-author-img" />
                </a>
                &nbsp;
                <a href="/profile/jacob-schmidt" className="comment-author">
                  Jacob Schmidt
                </a>
                <span className="date-posted">Dec 29th</span>
              </div>
            </div>

            <div className="card">
              <div className="card-block">
                <p className="card-text">With supporting text below as a natural lead-in to additional content.</p>
              </div>
              <div className="card-footer">
                <a href="/profile/author" className="comment-author">
                  <img src="http://i.imgur.com/Qr71crq.jpg" className="comment-author-img" />
                </a>
                &nbsp;
                <a href="/profile/jacob-schmidt" className="comment-author">
                  Jacob Schmidt
                </a>
                <span className="date-posted">Dec 29th</span>
                <span className="mod-options">
                  <i className="ion-trash-a"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
