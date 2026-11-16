import type { NodeAdapterOptions } from "@nestjs/platform-node"

export const NODE_ADAPTER_OPTIONS: NodeAdapterOptions = {
  // NodeRouter defaults maxParamLength to 100, which rejects long RealWorld article slugs with HTTP 414.
  maxParamLength: 2048,
}
