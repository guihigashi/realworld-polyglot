export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER")

export interface PasswordHasher {
  verify(plainPassword: string, hashedPassword: string): Promise<boolean>
  hash(plainPassword: string): Promise<string>
}
