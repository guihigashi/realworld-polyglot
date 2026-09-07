import { api } from "../state/api.ts"

type FavoriteToggleProps = Pick<Article, "slug" | "favorited" | "favoritesCount">

export default function FavoriteToggle({ slug, favorited, favoritesCount }: FavoriteToggleProps) {
  const [favorite] = api.useFavoriteArticleMutation()
  const [unfavorite] = api.useUnfavoriteArticleMutation()

  return (
    <button
      className="btn btn-outline-primary btn-sm pull-xs-right"
      onClick={async () => {
        try {
          const result = favorited ? await unfavorite(slug) : await favorite(slug)
        } catch (e) {
          console.error(e)
        }
      }}
    >
      <i className="ion-heart"></i> {favoritesCount}
    </button>
  )
}
