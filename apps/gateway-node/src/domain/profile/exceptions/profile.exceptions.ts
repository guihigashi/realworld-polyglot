export class ProfileNotFoundException extends Error {
  constructor() {
    super("Profile not found")
    this.name = "ProfileNotFoundException"
  }
}
