import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router"
import { store } from "../state/store.ts"
import { api } from "../state/api.ts"
import ProfileAvatar from "../components/profile-avatar.tsx"
import { clsx } from "clsx"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addCommentRequestSchema } from "../types/schemas.ts"
import type { ComponentProps, ReactNode } from "react"
import dayjs from "dayjs"

export const Route = createFileRoute("/article/$slug")({
  component: Article,
  loader: async ({ params, context }) => {
    const { article } = await store
      .dispatch(
        api.endpoints.getArticle.initiate(params.slug, {
          forceRefetch: true,
        }),
      )
      .unwrap()

    return { article, user: context.auth.status === "authenticated" ? context.auth.user : null }
  },
})

function Article() {
  const { article, user } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate({ from: Route.to })
  const [deleteArticle] = api.useDeleteArticleMutation()
  const [favoriteArticle] = api.useFavoriteArticleMutation()
  const [unfavoriteArticle] = api.useUnfavoriteArticleMutation()
  const { data: comments } = api.useGetCommentsQuery(article.slug)

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
            {user?.username === article.author.username ? (
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
            {user?.username === article.author.username ? (
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
            {user ? <AddCommentForm slug={article.slug} profile={user} /> : null}

            {comments?.comments.map((c) => {
              const deleteButton =
                user?.username === c.author.username ? <DeleteCommentButton slug={article.slug} id={c.id} /> : null
              return <CommentComponent key={c.id} comment={c} deleteButton={deleteButton} />
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function AddCommentForm({ slug, profile }: { slug: string } & Pick<ComponentProps<typeof ProfileAvatar>, "profile">) {
  const { register, handleSubmit } = useForm<AddCommentRequest>({
    defaultValues: {
      body: "",
    },
    resolver: zodResolver(addCommentRequestSchema),
  })

  const [addComment] = api.useAddCommentMutation()

  return (
    <form
      className="card comment-form"
      onSubmit={handleSubmit(async (data) => {
        try {
          await addComment({ slug, comment: data }).unwrap()
        } catch (e) {
          console.error(e)
        }
      })}
    >
      <div className="card-block">
        <textarea className="form-control" placeholder="Write a comment..." rows={3} {...register("body")}></textarea>
      </div>
      <div className="card-footer">
        <ProfileAvatar profile={profile} className="comment-author-img" />
        <button className="btn btn-sm btn-primary" type="submit">
          Post Comment
        </button>
      </div>
    </form>
  )
}

function CommentComponent({ comment, deleteButton }: { comment: ArticleComment; deleteButton: ReactNode }) {
  return (
    <div className="card">
      <div className="card-block">
        <p className="card-text">{comment.body}</p>
      </div>
      <div className="card-footer">
        <Link className="comment-author" to="/profile/$username" params={{ username: comment.author.username }}>
          <ProfileAvatar profile={comment.author} className="comment-author-img" />
        </Link>
        &nbsp;
        <Link className="comment-author" to="/profile/$username" params={{ username: comment.author.username }}>
          {comment.author.username}
        </Link>
        <span className="date-posted">{dayjs(comment.createdAt).format("MMM Do")}</span>
        {deleteButton}
      </div>
    </div>
  )
}

function DeleteCommentButton({ slug, id }: { slug: string; id: number }) {
  const [deleteComment] = api.useDeleteCommentMutation()

  return (
    <span
      className="mod-options"
      onClick={async () => {
        try {
          await deleteComment({ slug, id }).unwrap()
        } catch (e) {
          console.error(e)
        }
      }}
      role="button"
    >
      <i className="ion-trash-a" />
    </span>
  )
}
