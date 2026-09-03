import { Provider } from "react-redux"
import { store } from "./state/store.ts"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen.ts"
import { useAppDispatch, useAppSelector } from "./state/hooks.ts"
import { useEffect } from "react"
import { verifyStoredToken } from "./state/authSlice.ts"

const router = createRouter({
  routeTree,
  context: {
    auth: {
      status: "uninitialized",
    },
  },
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

function InnerApp() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(verifyStoredToken())
  }, [dispatch])

  if (auth.status === "uninitialized") {
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
