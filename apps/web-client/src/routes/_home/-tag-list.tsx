import { api } from "../../state/api.ts"
import { Link } from "@tanstack/react-router"

export default function TagList() {
  const { data: tags } = api.useGetTagsQuery()

  return (
    <>
      <p>Popular Tags</p>

      <div className="tag-list">
        {tags?.tags.map((tag) => (
          <Link key={tag} to="/tag/$tag" params={{ tag }} className="tag-pill tag-default" resetScroll={false}>
            {tag}
          </Link>
        ))}
      </div>
    </>
  )
}
