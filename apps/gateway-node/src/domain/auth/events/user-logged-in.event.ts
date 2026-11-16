import type { User } from "@/domain/auth/entities/user.entity.js"

export interface UserLoggedInPayload {
  event: "UserLoggedIn"
  occurred_at: string
  data: {
    user_id: string
    email: string
    username: string
  }
}

export class UserLoggedInEvent {
  readonly occurredAt: Date

  constructor(
    readonly user: User,
    occurredAt?: Date,
  ) {
    this.occurredAt = occurredAt ?? new Date()
  }

  eventName(): string {
    return "user.logged_in"
  }

  toPayload(): UserLoggedInPayload {
    return {
      event: "UserLoggedIn",
      occurred_at: this.occurredAt.toISOString(),
      data: {
        user_id: this.user.getId(),
        email: this.user.getEmail(),
        username: this.user.getUsername(),
      },
    }
  }
}
