import type { ChannelOptions } from "@grpc/grpc-js"

export const DEFAULT_GRPC_CHANNEL_OPTIONS: ChannelOptions = {
  "grpc.keepalive_time_ms": 20_000,
  "grpc.keepalive_timeout_ms": 5_000,
  "grpc.initial_reconnect_backoff_ms": 100,
  "grpc.min_reconnect_backoff_ms": 100,
  "grpc.max_reconnect_backoff_ms": 1_000,
  "grpc.default_service_config": JSON.stringify({
    methodConfig: [
      {
        name: [{}],
        waitForReady: true,
        timeout: "2.0s",
      },
    ],
  }),
}

export function getGrpcErrorCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code
    return typeof code === "number" ? code : undefined
  }
  return undefined
}

export function getGrpcErrorDetails(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    if ("details" in error && typeof (error as { details: unknown }).details === "string") {
      return (error as { details: string }).details
    }
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message
    }
  }
  return ""
}
