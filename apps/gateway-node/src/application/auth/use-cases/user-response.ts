import type { User } from "@/domain/auth/entities/user.entity.js"

export interface UserResponse {
  email: string
  token: string
  username: string
  bio: string | null
  image: string | null
}

export function toUserResponse(user: User, token: string): UserResponse {
  return {
    email: user.getEmail(),
    token,
    username: user.getUsername(),
    bio: user.getBio(),
    image: user.getImage(),
  }
}
