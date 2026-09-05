import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createArticleRequestSchema } from "../../types/schemas.ts"
import { type KeyboardEvent, useState } from "react"
import { api } from "../../state/api.ts"
import { useNavigate } from "@tanstack/react-router"

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

  const { register, handleSubmit, control } = useForm<CreateArticleRequestIn, unknown, CreateArticleRequestOut>({
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

  const navigate = useNavigate()

  return (
    <div className="editor-page">
      <div className="container page">
        <div className="row">
          <div className="col-md-10 offset-md-1 col-xs-12">
            <ul className="error-messages">
              <li>That title is required</li>
            </ul>

            <form
              onSubmit={handleSubmit(async (data) => {
                try {
                  const { article: newArticle } = isEditing
                    ? await updateArticleMutation({ slug: article.slug, article: data }).unwrap()
                    : await createArticleMutation({ article: data }).unwrap()

                  await navigate({ to: "/article/$slug", params: { slug: newArticle.slug } })
                } catch (e) {
                  console.error(e)
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
                </fieldset>
                <fieldset className="form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="What's this article about?"
                    {...register("description")}
                  />
                </fieldset>
                <fieldset className="form-group">
                  <textarea
                    className="form-control"
                    rows={8}
                    placeholder="Write your article (in markdown)"
                    {...register("body")}
                  ></textarea>
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
                <button className="btn btn-lg pull-xs-right btn-primary" type="submit">
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
