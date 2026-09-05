import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import type { RootState } from "../state/store.ts"
import { useAppSelector } from "../state/hooks.ts"

function RootLayout() {
  const auth = useAppSelector((state: RootState) => state.auth)
  return (
    <>
      {auth.status === "authenticated" ? (
        <nav className="navbar navbar-light">
          <div className="container">
            <Link className="navbar-brand" to="/">
              conduit
            </Link>
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className="nav-link" to="/" activeProps={{ className: "active" }}>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/editor"

                  activeProps={{ className: "active" }}
                >
                  {" "}
                  <i className="ion-compose"></i>&nbsp;New Article{" "}
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/settings"

                  activeProps={{ className: "active" }}
                >
                  {" "}
                  <i className="ion-gear-a"></i>&nbsp;Settings{" "}
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/profile/$username"
                  params={{
                    username: auth.user.username,
                  }}
                  activeProps={{ className: "active" }}
                >
                  <img src="" className="user-pic" />
                  {auth.user.username}
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      ) : (
        <nav className="navbar navbar-light">
          <div className="container">
            <Link className="navbar-brand" to="/">
              conduit
            </Link>
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                <Link className="nav-link" to="/" activeProps={{ className: "active" }}>
                  Home
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/login" activeProps={{ className: "active" }}>
                  Sign in
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register" activeProps={{ className: "active" }}>
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      )}

      <Outlet />

      <footer>
        <div className="container">
          <Link to="/" className="logo-font">
            conduit
          </Link>
          <span className="attribution">An interactive learning project. Code &amp; design licensed under MIT.</span>
        </div>
      </footer>
      <TanStackRouterDevtools />
    </>
  )
}

type RouterContext = Pick<RootState, "auth">

export const Route = createRootRouteWithContext<RouterContext>()({ component: RootLayout })
