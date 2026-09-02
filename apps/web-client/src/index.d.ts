type LoginRequest = {
  user: {
    email: string
    password: string
  }
}

type User = {
  user: {
    email: string
    token: string
    username: string
    bio: string | null
    image: string | null
  }
}
