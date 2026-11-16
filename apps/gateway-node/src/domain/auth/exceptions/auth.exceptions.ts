export class InvalidCredentialsException extends Error {
  constructor() {
    super("Invalid email or password")
    this.name = "InvalidCredentialsException"
  }
}

export class UserNotFoundException extends Error {
  constructor() {
    super("User not found")
    this.name = "UserNotFoundException"
  }
}

export class DuplicateUserFieldException extends Error {
  constructor(readonly field: "username" | "email") {
    super(`${field} has already been taken`)
    this.name = "DuplicateUserFieldException"
  }
}
