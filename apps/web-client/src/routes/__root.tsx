import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import type { RootState } from "../state/store.ts"
import { useAppSelector } from "../state/hooks.ts"

function RootLayout() {
  const auth = useAppSelector((state: RootState) => state.auth)
  return (
    <>
      {auth.isAuthenticated ? (
        <nav className="navbar navbar-light">
          <div className="container">
            <a className="navbar-brand" href="/">
              conduit
            </a>
            <ul className="nav navbar-nav pull-xs-right">
              <li className="nav-item">
                {/* Add "active" class when you're on that page */}
                <a className="nav-link active" href="/">
                  Home
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/editor">
                  {" "}
                  <i className="ion-compose"></i>&nbsp;New Article{" "}
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/settings">
                  {" "}
                  <i className="ion-gear-a"></i>&nbsp;Settings{" "}
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/profile/eric-simons">
                  <img src="" className="user-pic" />
                  Eric Simons
                </a>
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
