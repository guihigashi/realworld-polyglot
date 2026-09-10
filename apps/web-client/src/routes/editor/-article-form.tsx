import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createArticleRequestSchema } from "../../types/schemas.ts"
import { type KeyboardEvent, useState } from "react"
import { api } from "../../state/api.ts"
import { useNavigate } from "@tanstack/react-router"
import { handleFormError } from "../../utils/helpers.ts"
import { useDispatch } from "react-redux"

function initialValue(article?: Article): CreateArticleRequestIn {
  if (article) {
    return {
      title: article.title,
      description: article.description,
      body: article.body,
      tagList: article.tagList.map((tag) => ({ value: tag })),
    }
  }
  return {
    title: "",
    description: "",
    body: "",
    tagList: [],
  }
}

type ArticleFormProps = {
  from: string
  article?: Article
}
export default function ArticleForm({ article }: ArticleFormProps) {
  const isEditing = typeof article?.slug === "string"

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    setError,
    clearErrors,
  } = useForm<CreateArticleRequestIn, unknown, CreateArticleRequestOut>({
    values: initialValue(article),
    resolver: zodResolver(createArticleRequestSchema),
  })

  const { fields, append, remove } = useFieldArray({ control, name: "tagList" })

  const [tagInputText, setTagInputText] = useState("")
  const tagInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const trimmed = tagInputText.trim()
      if (trimmed !== "") {
        if (!fields.some((field) => field.value === trimmed)) {
          append({ value: trimmed })
        }
        setTagInputText("")
      }
    }
  }

  const [createArticleMutation] = api.useCreateArticleMutation()
  const [updateArticleMutation] = api.useUpdateArticleMutation()
  const dispatch = useDispatch()

  const navigate = useNavigate()

  return (
    <div className="editor-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-10 offset-md-1 col-xs-12">
            {errors.root && (
              <ul className="error-messages">
                <li>{errors.root.message}</li>
              </ul>
            )}

            <form
              onSubmit={handleSubmit(async (data) => {
                clearErrors()
                try {
                  let newArticle: Article

                  if (isEditing) {
                    const payload = await updateArticleMutation({ slug: article.slug, article: data }).unwrap()

                    if (article.slug === payload.article.slug) {
                      dispatch(api.util.invalidateTags([{ type: "Article", id: article.slug }]))
                    }

                    newArticle = payload.article
                  } else {
                    const payload = await createArticleMutation({ article: data }).unwrap()
                    newArticle = payload.article
                  }

                  await navigate({ to: "/article/$slug", params: { slug: newArticle.slug } })
                } catch (e) {
                  handleFormError(e, setError)
                }
              })}
            >
              <fieldset>
                <fieldset className="form-group">
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Article Title"
                    {...register("title")}
                  />
                  {errors.title && <span className="form-field-error-message">{errors.title.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="What's this article about?"
                    {...register("description")}
                  />
                  {errors.description && <span className="form-field-error-message">{errors.description.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <textarea
                    className="form-control"
                    rows={8}
                    placeholder="Write your article (in markdown)"
                    {...register("body")}
                  />
                  {errors.body && <span className="form-field-error-message">{errors.body.message}</span>}
                </fieldset>
                <fieldset className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter tags"
                    value={tagInputText}
                    onChange={(e) => setTagInputText(e.target.value)}
                    onKeyDown={tagInputKeyDown}
                  />

                  <div className="tag-list">
                    {fields.map((field, index) => (
                      <span key={field.id} className="tag-default tag-pill">
                        <i className="ion-close-round" onClick={() => remove(index)} /> {field.value}
                      </span>
                    ))}
                  </div>
                </fieldset>
                <button className="btn btn-lg pull-xs-right btn-primary" type="submit" disabled={!isDirty}>
                  Publish Article
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
