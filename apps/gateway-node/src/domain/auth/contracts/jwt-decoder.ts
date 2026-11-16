export const JWT_DECODER = Symbol("JWT_DECODER")

export interface JwtPayload {
  sub: string
  email?: string
  username?: string
  iss?: string
  iat?: number
  exp?: number
}

export interface JwtDecoder {
  decode(token: string): Promise<JwtPayload | null>
}
