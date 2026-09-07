import { api } from "../state/api.ts"
import { useEffect } from "react"

type FollowToggleProps = Pick<Profile, "username" | "following">

export default function FollowToggle({ username, following }: FollowToggleProps) {
  const [followUserMutation] = api.useFollowUserMutation()
  const [unfollowUserMutation] = api.useUnfollowUserMutation()
  const label = following ? ` Unfollow ${username}` : ` Follow ${username}`

  useEffect(() => {
    console.log(username, following, label)
  }, [username, following, label])

  return (
    <button
      className="btn btn-sm btn-outline-secondary action-btn"
      onClick={async () => {
        try {
          const result = following ? await unfollowUserMutation(username) : await followUserMutation(username)
          console.log(result)
        } catch (e) {
          console.error(e)
        }
      }}
    >
      <i className="ion-plus-round"></i>
      {label}
    </button>
  )
}
