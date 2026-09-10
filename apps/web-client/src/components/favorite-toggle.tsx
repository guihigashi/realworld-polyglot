import { api } from "../state/api.ts"
import type { ComponentProps } from "react"
import { clsx } from "clsx"

type FavoriteToggleProps = {
  article: Pick<Article, "slug" | "favorited" | "favoritesCount">
  variant?: "icon-only" | "with-label"
} & Pick<ComponentProps<"button">, "className">

export default function FavoriteToggle({ article, variant = "with-label", className }: FavoriteToggleProps) {
  const { slug, favorited, favoritesCount } = article

  const [favorite] = api.useFavoriteArticleMutation()
  const [unfavorite] = api.useUnfavoriteArticleMutation()

  return (
    <button
      className={clsx("btn btn-sm", favorited ? "btn-primary" : "btn-outline-primary", className)}
      onClick={async () => {
        try {
          if (favorited) {
            await unfavorite(slug)
          } else {
            await favorite(slug)
          }
        } catch (e) {
          console.error(e)
        }
      }}
    >
      <i className="ion-heart" />
      {variant === "icon-only" ? (
        <>&nbsp; {favoritesCount}</>
      ) : (
        <>
          &nbsp; {favorited ? "Unfavorite" : "Favorite"} Post <span className="counter">({favoritesCount})</span>
        </>
      )}
    </button>
  )
}
