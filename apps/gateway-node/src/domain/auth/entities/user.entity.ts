export interface UserProps {
  id: string
  username: string
  email: string
  passwordHash: string
  bio?: string | null
  image?: string | null
}

export class User {
  private readonly id: string
  private username: string
  private email: string
  private passwordHash: string
  private bio: string | null
  private image: string | null

  constructor(props: UserProps) {
    this.id = props.id
    this.username = props.username
    this.email = props.email
    this.passwordHash = props.passwordHash
    this.bio = props.bio ?? null
    this.image = props.image ?? null
  }

  getId(): string {
    return this.id
  }

  getUsername(): string {
    return this.username
  }

  getEmail(): string {
    return this.email
  }

  getPasswordHash(): string {
    return this.passwordHash
  }

  getBio(): string | null {
    return this.bio
  }

  getImage(): string | null {
    return this.image
  }

  changeUsername(username: string): void {
    this.username = username
  }

  changeEmail(email: string): void {
    this.email = email
  }

  changePassword(passwordHash: string): void {
    this.passwordHash = passwordHash
  }

  changeBio(bio: string | null): void {
    this.bio = bio === null || bio.trim() === "" ? null : bio
  }

  changeImage(image: string | null): void {
    this.image = image === null || image.trim() === "" ? null : image
  }
}
