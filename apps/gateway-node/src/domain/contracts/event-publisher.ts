export const EVENT_PUBLISHER = Symbol("EVENT_PUBLISHER")

export interface EventPublisher {
  publish(routingKey: string, payload: unknown): Promise<void>
}
