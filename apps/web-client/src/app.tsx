import { Provider } from "react-redux"
import { store } from "./state/store.ts"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen.ts"
import { useAppSelector } from "./state/hooks.ts"
import { useEffect } from "react"
import { makeConduitDebug, verifyStoredToken } from "./state/authSlice.ts"
import "./styles.css"

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

  useEffect(() => {
    window.__conduit_debug__ = makeConduitDebug(auth)
  }, [auth])

  useEffect(() => {
    router.invalidate().catch((e) => {
      console.error("invalidating router", e)
    })
  }, [auth])

  if (auth.status === "loading") {
    return <div>Loading application...</div>
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
