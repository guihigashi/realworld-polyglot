import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/state/hooks.ts"
import { api } from "@/state/api.ts"

export interface InvalidationEvent {
  type: string
  resource: string
  slug?: string
  recipientId?: string
  timestamp: string
}

export function useRealtimeEvents() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((state) => state.auth)
  const token = auth.status === "authenticated" ? auth.user.token : null

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_EVENTS_URL || "/events"
    const url = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
    let eventSource: EventSource | null = null

    try {
      eventSource = new EventSource(url)

      eventSource.addEventListener("invalidation", (event) => {
        try {
          const data: InvalidationEvent = JSON.parse(event.data)
          console.debug("[Realtime] Received invalidation event:", data)

          if (data.resource === "articles") {
            dispatch(
              api.util.invalidateTags([
                "Article",
                "ArticleSummary",
                ...(data.slug ? [{ type: "Article" as const, id: data.slug }] : []),
              ])
            )
          } else if (data.resource === "comments") {
            dispatch(
              api.util.invalidateTags([
                "Comment",
                ...(data.slug ? [{ type: "Comment" as const, id: data.slug }] : []),
              ])
            )
          } else if (data.resource === "profiles") {
            dispatch(api.util.invalidateTags(["Profile"]))
          }
        } catch (err) {
          console.error("[Realtime] Failed to parse invalidation event payload:", err)
        }
      })

      eventSource.onerror = (err) => {
        // EventSource will automatically retry connecting
        console.warn("[Realtime] SSE connection error, will retry:", err)
      }
    } catch (e) {
      console.error("[Realtime] Could not initialize EventSource:", e)
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [dispatch, token])
}
