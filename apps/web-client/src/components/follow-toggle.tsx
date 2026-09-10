import { api } from "../state/api.ts"
import { clsx } from "clsx"

type FollowToggleProps = {
  profile: Pick<Profile, "username" | "following">
  onSuccess?: () => void
  variant?: "profile" | "article"
}

export default function FollowToggle({ profile, onSuccess, variant }: FollowToggleProps) {
  const { username, following } = profile
  const label = following ? ` Unfollow ${username}` : ` Follow ${username}`

  const [followUserMutation] = api.useFollowUserMutation()
  const [unfollowUserMutation] = api.useUnfollowUserMutation()

  return (
    <button
      className={clsx(
        "btn btn-sm",
        following ? "btn-secondary" : "btn-outline-secondary",
        variant === "profile" && "action-btn",
      )}
      onClick={async () => {
        try {
          if (following) {
            await unfollowUserMutation(username)
          } else {
            await followUserMutation(username)
          }
          onSuccess?.()
        } catch (e) {
          console.error(e)
        }
      }}
    >
      <i className="ion-plus-round" />
      {label}
    </button>
  )
}
