import { jwtVerify } from "jose"
import { randomBytes } from "node:crypto"
import { decodeAppKey } from "@/config/env.schema.js"
import { User } from "@/domain/auth/entities/user.entity.js"
import { BcryptPasswordHasher } from "@/infrastructure/auth/providers/bcrypt-password-hasher.js"
import { JoseJwtProvider } from "@/infrastructure/auth/providers/jose-jwt.provider.js"

describe("JoseJwtProvider & BcryptPasswordHasher", () => {
  it("decodes base64:-prefixed APP_KEY into raw bytes for HS256 JWTs", async () => {
    const rawKey = randomBytes(32)
    const secret = decodeAppKey(`base64:${rawKey.toString("base64")}`)
    const provider = new JoseJwtProvider({ jwtSecret: secret })

    const user = new User({
      id: "11111111-1111-1111-1111-111111111111",
      username: "astrid",
      email: "astrid@berk.org",
      passwordHash: "hash",
    })

    const token = await provider.generateForUser(user)
    const { payload } = await jwtVerify(token, rawKey, { algorithms: ["HS256"] })
    const decoded = await provider.decode(token)

    expect(payload.sub).toBe(user.getId())
    expect(payload.iss).toBe("identity-gateway")
    expect(decoded?.sub).toBe(user.getId())
    expect(decoded?.username).toBe("astrid")
    expect(decoded?.email).toBe("astrid@berk.org")
  })

  it("supports plain non-base64 APP_KEY strings as well", async () => {
    const secret = decodeAppKey("plain-raw-secret-with-at-least-32-bytes")
    const provider = new JoseJwtProvider({ jwtSecret: secret })

    const user = new User({
      id: "11111111-1111-1111-1111-111111111111",
      username: "hiccup",
      email: "hiccup@berk.org",
      passwordHash: "hash",
    })

    const token = await provider.generateForUser(user)
    const decoded = await provider.decode(token)

    expect(decoded).not.toBeNull()
    expect(decoded?.sub).toBe(user.getId())
    expect(decoded?.username).toBe("hiccup")
  })

  it("returns null for tampered or malformed JWTs", async () => {
    const provider = new JoseJwtProvider({ jwtSecret: decodeAppKey("secret-key-at-least-32-bytes-long") })
    expect(await provider.decode("not.a.jwt")).toBeNull()
  })

  it("hashes and verifies passwords including Laravel $2y$ bcrypt hashes", async () => {
    const hasher = new BcryptPasswordHasher()
    const hash = await hasher.hash("password123")
    expect(await hasher.verify("password123", hash)).toBe(true)
    expect(await hasher.verify("wrong", hash)).toBe(false)

    const laravelStyleHash = `$2y$${hash.slice(4)}`
    expect(await hasher.verify("password123", laravelStyleHash)).toBe(true)
  })
})
