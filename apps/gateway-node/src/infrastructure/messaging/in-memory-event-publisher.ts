import type { EventPublisher } from "@/domain/contracts/event-publisher.js"

export interface PublishedEvent {
  routingKey: string
  payload: unknown
}

export class InMemoryEventPublisher implements EventPublisher {
  private readonly events: PublishedEvent[] = []

  async publish(routingKey: string, payload: unknown): Promise<void> {
    this.events.push({ routingKey, payload })
  }

  getEvents(): PublishedEvent[] {
    return this.events
  }

  count(): number {
    return this.events.length
  }
}
