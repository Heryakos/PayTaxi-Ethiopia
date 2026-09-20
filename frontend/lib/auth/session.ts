import { createHash, randomBytes, randomInt } from "node:crypto"
import { cookies } from "next/headers"
import { and, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { appSession, appUser, otpChallenge } from "@/lib/db/schema"
import type { UserRole } from "@/lib/shared/types"

export const SESSION_COOKIE = "paytaxi_session"
const SESSION_DAYS = 30
const OTP_MINUTES = 10

export function normalizePhone(phone: string) {
  const digits = phone.replace(/[^0-9+]/g, "")
  if (!/^\+?[0-9]{9,15}$/.test(digits)) throw new Error("Enter a valid phone number")
  return digits.startsWith("+") ? digits : `+${digits}`
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export async function createOtp(phoneInput: string, role: UserRole) {
  const phone = normalizePhone(phoneInput)
  const code = randomInt(100000, 1000000).toString()
  const id = randomBytes(16).toString("hex")
  await db.insert(otpChallenge).values({
    id,
    phone,
    role,
    codeHash: hash(code),
    expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000),
  })
  console.log(`[v0] PayTaxi OTP for ${phone}: ${code}`)
  return { challengeId: id, code, expiresInSeconds: OTP_MINUTES * 60 }
}

export async function verifyOtp(challengeId: string, code: string) {
  const challenge = (await db.select().from(otpChallenge).where(eq(otpChallenge.id, challengeId)).limit(1))[0]
  if (!challenge || challenge.consumedAt || challenge.expiresAt <= new Date()) throw new Error("OTP expired or invalid")
  const attempts = Number(challenge.attempts)
  if (attempts >= 5) throw new Error("Too many attempts")
  if (hash(code) !== challenge.codeHash) {
    await db.update(otpChallenge).set({ attempts: String(attempts + 1) }).where(eq(otpChallenge.id, challenge.id))
    throw new Error("Incorrect OTP")
  }
  await db.update(otpChallenge).set({ consumedAt: new Date() }).where(eq(otpChallenge.id, challenge.id))
  const existing = (await db.select().from(appUser).where(eq(appUser.phone, challenge.phone)).limit(1))[0]
  let user = existing
  if (!user) {
    const id = randomBytes(16).toString("hex")
    const created = await db.insert(appUser).values({ id, phone: challenge.phone, role: challenge.role, isVerified: true }).returning()
    user = created[0]
  } else {
    if (user.role !== challenge.role && user.role !== "ADMIN") throw new Error("This phone is registered for another role")
    const updated = await db.update(appUser).set({ isVerified: true }).where(eq(appUser.id, user.id)).returning()
    user = updated[0]
  }
  const sessionId = randomBytes(24).toString("hex")
  await db.insert(appSession).values({ id: sessionId, userId: user.id, expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86_400 })
  return user
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const id = cookieStore.get(SESSION_COOKIE)?.value
  if (!id) return null
  const rows = await db.select({ user: appUser }).from(appSession).innerJoin(appUser, eq(appSession.userId, appUser.id)).where(and(eq(appSession.id, id), gt(appSession.expiresAt, new Date())))
  return rows[0]?.user ?? null
}

export async function requireRole(role: UserRole) {
  const user = await getSessionUser()
  if (!user || (user.role !== role && user.role !== "ADMIN")) throw new Error("Unauthorized")
  return user
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`
}

export function hashValue(value: string) {
  return hash(value)
}

export function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505")
}
