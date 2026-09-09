import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { api } from "../state/api.ts"
import ProfileAvatar from "../components/profile-avatar.tsx"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { addCommentRequestSchema } from "../types/schemas.ts"
import { type ComponentProps, type ReactNode } from "react"
import dayjs from "dayjs"
import FollowToggle from "../components/follow-toggle.tsx"
import FavoriteToggle from "../components/favorite-toggle.tsx"
import RouterButton from "../components/router-button.tsx"
import { skipToken } from "@reduxjs/toolkit/query/react"
import { useAppDispatch } from "../state/hooks.ts"

export const Route = createFileRoute("/article/$slug")({
  component: Article,
  loader: ({ context }) => {
    return { user: context.auth.status === "authenticated" ? context.auth.user : null }
  },
})

function Article() {
  const { user } = Route.useLoaderData()
  const { slug } = Route.useParams()
  const { data: articleData } = api.useGetArticleQuery(slug)

  const article = articleData?.article

  const { data: comments } = api.useGetCommentsQuery(article?.slug ?? skipToken)

  if (!article) {
    return null
  }

  return (
    <div className="article-page">
      <div className="banner">
        <div className="container">
          <h1>{article.title}</h1>

          <ArticleMeta article={article} userIsOwner={user?.username === article.author.username} />
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
          <ArticleMeta article={article} userIsOwner={user?.username === article.author.username} />
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

function ArticleMeta({ article, userIsOwner }: { article: Article; userIsOwner: boolean }) {
  const navigate = useNavigate({ from: Route.to })
  const [deleteArticle] = api.useDeleteArticleMutation()
  const dispatch = useAppDispatch()

  return (
    <div className="article-meta">
      <Link to="/profile/$username" params={{ username: article.author.username }}>
        <ProfileAvatar profile={article.author} />
      </Link>
      <div className="info">
        <Link to="/profile/$username" params={{ username: article.author.username }} className="author">
          {article.author.username}
        </Link>
        <span className="date">{dayjs(article.createdAt).format("MMMM Do")}</span>
      </div>
      {!userIsOwner && (
        <FollowToggle
          variant="article"
          profile={article.author}
          onSuccess={() => {
            dispatch(api.util.invalidateTags([{ type: "Article", id: article.slug }]))
          }}
        />
      )}
      &nbsp;
      <FavoriteToggle className="btn btn-sm btn-outline-primary" article={article} />
      {userIsOwner && (
        <>
          <RouterButton to="/editor/$slug" params={{ slug: article.slug }} className="btn btn-sm btn-outline-secondary">
            <i className="ion-edit" /> Edit Article
          </RouterButton>
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
            <i className="ion-trash-a" /> Delete Article
          </button>
        </>
      )}
    </div>
  )
}

function AddCommentForm({ slug, profile }: { slug: string } & Pick<ComponentProps<typeof ProfileAvatar>, "profile">) {
  const { register, handleSubmit, resetField } = useForm<AddCommentRequest>({
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

          resetField("body")
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
