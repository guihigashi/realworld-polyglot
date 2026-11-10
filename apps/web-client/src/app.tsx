import { Provider } from "react-redux"
import { store } from "@/state/store.ts"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "@/routeTree.gen.ts"
import { useAppSelector } from "@/state/hooks.ts"
import { useEffect } from "react"
import { makeConduitDebug, verifyStoredToken } from "@/state/authSlice.ts"
import { useRealtimeEvents } from "@/utils/useRealtimeEvents.ts"
import "@/styles.css"
import 'react-loading-skeleton/dist/skeleton.css'

const router = createRouter({
  routeTree,
  context: {
    auth: {
      status: "loading",
    },
  },
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

if (typeof window !== "undefined") {
  store.dispatch(verifyStoredToken())
}

function InnerApp() {
  const auth = useAppSelector((state) => state.auth)
  useRealtimeEvents()

  useEffect(() => {
    window.__conduit_debug__ = makeConduitDebug(auth)
  }, [auth])

  useEffect(() => {
    router.invalidate().catch((e) => {
      console.error("invalidating router", e)
    })
  }, [auth])

  if (auth.status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
        }}
      >
        <h1 className="logo-font" style={{ fontSize: "2.75rem", margin: 0, color: "var(--brand)" }}>
          conduit
        </h1>
        <i className="ion-load-c" style={{ fontSize: "2rem", color: "var(--brand)" }} />
      </div>
    )
  }

  return <RouterProvider router={router} context={{ auth }} />
}

export default function App() {
  return (
    <Provider store={store}>
      <InnerApp />
    </Provider>
  )
}
