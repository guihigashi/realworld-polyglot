import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { store } from "../state/store.ts"
import { api } from "../state/api.ts"
import ProfileAvatar from "../components/profile-avatar.tsx"
import { useEffect, useState } from "react"
import ArticlePreview from "../components/article-preview.tsx"
import { clsx } from "clsx"

export const Route = createFileRoute("/profile/$username")({
  component: Profile,
  loader: async ({ params, context }) => {
    try {
      const { profile } = await store.dispatch(api.endpoints.getProfile.initiate(params.username)).unwrap()

      return { profile, user: context.auth.status === "authenticated" ? context.auth.user : null }
    } catch (e) {
      throw redirect({ to: "/", replace: true })
    }
  },
})

function Profile() {
  const { username } = Route.useParams()
  const { user } = Route.useLoaderData()
  const { data } = api.useGetProfileQuery(username)

  type Tabs = "my-articles" | "favorited"

  const [selectedTab, setSelectedTab] = useState<Tabs>("my-articles")
  const activateTabIf = (s: Tabs) => selectedTab === s && "active"

  const { data: articles } = api.useListArticlesQuery({ author: username })

  const profile = data?.profile

  if (!profile) {
    return null
  }

  return (
    <div className="profile-page">
      <div className="user-info">
        <div className="container">
          <div className="row">
            <div className="col-xs-12 col-md-10 offset-md-1">
              <ProfileAvatar profile={profile} className="user-img" />
              <h4>{profile.username}</h4>
              <p>{profile.bio}</p>
              {user && user.username !== profile.username ? (
                <FollowToggle {...profile} />
              ) : (
                <Link className="btn btn-sm btn-outline-secondary action-btn" to="/settings">
                  <i className="ion-gear-a"></i>
                  &nbsp; Edit Profile Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="row">
          <div className="col-xs-12 col-md-10 offset-md-1">
            <div className="articles-toggle">
              <ul className="nav nav-pills outline-active">
                <li className="nav-item">
                  <a
                    className={clsx("nav-link", activateTabIf("my-articles"))}
                    href="#"
                    onClick={() => {
                      setSelectedTab("my-articles")
                    }}
                  >
                    My Articles
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={clsx("nav-link", activateTabIf("favorited"))}
                    href="#"
                    onClick={() => {
                      setSelectedTab("favorited")
                    }}
                  >
                    Favorited Articles
                  </a>
                </li>
              </ul>
            </div>

            {selectedTab === "my-articles" ? (
              <MyArticles username={username} />
            ) : (
              <FavoritedArticles username={username} />
            )}

            <ul className="pagination">
              <li className="page-item active">
                <a className="page-link" href="">
                  1
                </a>
              </li>
              <li className="page-item">
                <a className="page-link" href="">
                  2
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type FollowToggleProps = Pick<Profile, "username" | "following">

function FollowToggle({ username, following }: FollowToggleProps) {
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

function MyArticles({ username }: Pick<Profile, "username">) {
  const { data } = api.useListArticlesQuery({ author: username })
  return (
    <>
      {data?.articles.map((a) => (
        <ArticlePreview key={a.slug} article={a} />
      ))}
    </>
  )
}

function FavoritedArticles({ username }: Pick<Profile, "username">) {
  const { data } = api.useListArticlesQuery({ favorited: username })
  return (
    <>
      {data?.articles.map((a) => (
        <ArticlePreview key={a.slug} article={a} />
      ))}
    </>
  )
}
