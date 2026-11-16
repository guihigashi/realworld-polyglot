export interface ProfileProps {
  username: string
  bio?: string | null
  image?: string | null
  following: boolean
  followsVersion?: number
}

export interface ProfileData {
  username: string
  bio: string | null
  image: string | null
  following: boolean
}

export class Profile {
  readonly username: string
  readonly bio: string | null
  readonly image: string | null
  readonly following: boolean
  readonly followsVersion: number

  constructor(props: ProfileProps) {
    this.username = props.username
    this.bio = props.bio ?? null
    this.image = props.image ?? null
    this.following = props.following
    this.followsVersion = props.followsVersion ?? 0
  }

  toJSON(): ProfileData {
    return {
      username: this.username,
      bio: this.bio,
      image: this.image,
      following: this.following,
    }
  }
}
