import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router"
import TagList from "./-tag-list.tsx"
import { clsx } from "clsx"

export const Route = createFileRoute("/_home")({
  component: HomeLayout,
})

type FeedType = "your-feed" | "global-feed"
function useFeedType(): FeedType {
  const location = useLocation()

  return location.search.feed === "following" ? "your-feed" : "global-feed"
}

function HomeLayout() {
  const feedType = useFeedType()

  return (
    <div className="home-page">
      <div className="banner">
        <div className="container">
          <h1 className="logo-font">conduit</h1>
          <p>A place to share your knowledge.</p>
        </div>
      </div>

      <div className="container page">
        <div className="row">
          <div className="col-md-9">
            <div className="feed-toggle">
              <ul className="nav nav-pills outline-active">
                <li className="nav-item">
                  <Link
                    to="/"
                    search={(prev) => ({ ...prev, feed: "following" })}
                    className={clsx("nav-link", feedType === "your-feed" && "active")}
                    activeOptions={{ exact: true }}
                    resetScroll={false}
                  >
                    Your Feed
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="/"
                    className={clsx("nav-link", feedType === "global-feed" && "active")}
                    activeOptions={{ exact: true }}
                    resetScroll={false}
                  >
                    Global Feed
                  </Link>
                </li>
              </ul>
            </div>

            <Outlet />
          </div>

          <div className="col-md-3">
            <div className="sidebar">
              <TagList />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
