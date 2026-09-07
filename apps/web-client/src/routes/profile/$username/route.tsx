import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { api } from "../../../state/api.ts"
import ProfileAvatar from "../../../components/profile-avatar.tsx"
import FollowToggle from "../../../components/follow-toggle.tsx"

export const Route = createFileRoute("/profile/$username")({
  component: ProfileLayout,
  loader: async ({ context }) => ({
    user: context.auth.status === "authenticated" ? context.auth.user : null,
  }),
})

function ProfileLayout() {
  const { username } = Route.useParams()
  const { user } = Route.useLoaderData()
  const { data } = api.useGetProfileQuery(username)

  const profile = data?.profile

  return (
    <div className="profile-page">
      <div className="user-info">
        <div className="container">
          <div className="row">
            <div className="col-xs-12 col-md-10 offset-md-1">
              {profile ? (
                <>
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
                </>
              ) : null}
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
                  <Link
                    to="/profile/$username"
                    params={{ username: username }}
                    className="nav-link"
                    activeOptions={{ exact: true }}
                    activeProps={{ className: "active" }}
                  >
                    My Articles
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="/profile/$username/favorites"
                    params={{ username: username }}
                    className="nav-link"
                    activeProps={{ className: "active" }}
                  >
                    Favorited Articles
                  </Link>
                </li>
              </ul>
            </div>

            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
