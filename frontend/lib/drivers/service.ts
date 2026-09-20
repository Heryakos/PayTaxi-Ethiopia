import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { driverProfile, taxiQr, transaction } from "@/lib/db/schema"
import { newId } from "@/lib/auth/session"

export async function getDriverForUser(userId: string) {
  return (await db.select().from(driverProfile).where(eq(driverProfile.userId, userId)).limit(1))[0] ?? null
}

export async function registerDriver(input: {
  userId: string
  name: string
  phone: string
  vehicleMake: string
  vehicleModel: string
  vehicleColor: string
  plateNumber: string
  nationalIdUrl?: string
  licenseUrl?: string
}) {
  const existing = await getDriverForUser(input.userId)
  if (existing) throw new Error("A driver profile already exists for this account")
  const profileId = newId("drv")
  // The profile is persisted as PENDING first. This is intentionally followed
  // by an explicit simulation approval below, preserving the production gate.
  await db.insert(driverProfile).values({
    id: profileId,
    userId: input.userId,
    displayName: input.name.trim(),
    vehicleMake: input.vehicleMake.trim(),
    vehicleModel: input.vehicleModel.trim(),
    vehicleColor: input.vehicleColor.trim(),
    plateNumber: input.plateNumber.trim().toUpperCase(),
    nationalIdUrl: input.nationalIdUrl || "mock://id-upload",
    licenseUrl: input.licenseUrl || "mock://license-upload",
    verificationStatus: "PENDING",
  })
  // Preview-only approval simulation. Production replaces this with an admin
  // decision and must not issue the QR before the decision is APPROVED.
  await db.update(driverProfile).set({ verificationStatus: "APPROVED" }).where(eq(driverProfile.id, profileId))
  const taxiId = `TX-${Math.floor(1000 + Math.random() * 8999)}`
  const qrId = newId("qr")
  const backupCode = Math.random().toString(36).slice(2, 10).toUpperCase()
  const qr = (await db.insert(taxiQr).values({
    id: qrId,
    taxiId,
    driverProfileId: profileId,
    status: "ACTIVE",
    qrPayloadUrl: `/t/${taxiId}`,
    backupCode,
  }).returning())[0]
  const profile = (await getDriverForUser(input.userId))!
  return { profile, qr }
}

export async function replaceLostQr(driverProfileId: string) {
  const driver = (await db.select().from(driverProfile).where(eq(driverProfile.id, driverProfileId)).limit(1))[0]
  if (!driver || driver.verificationStatus !== "APPROVED") throw new Error("Only approved drivers can replace a QR")
  const current = (await db.select().from(taxiQr).where(and(eq(taxiQr.driverProfileId, driverProfileId), eq(taxiQr.status, "ACTIVE"))).limit(1))[0]
  if (current) await db.update(taxiQr).set({ status: "REPLACED", disabledAt: new Date(), disabledReason: "LOST_OR_STOLEN" }).where(eq(taxiQr.id, current.id))
  const taxiId = `TX-${Math.floor(1000 + Math.random() * 8999)}`
  const qr = (await db.insert(taxiQr).values({ id: newId("qr"), taxiId, driverProfileId, status: "ACTIVE", qrPayloadUrl: `/t/${taxiId}`, backupCode: Math.random().toString(36).slice(2, 10).toUpperCase() }).returning())[0]
  return qr
}

export async function getScopedDashboard(driverProfileId: string) {
  const driver = (await db.select().from(driverProfile).where(eq(driverProfile.id, driverProfileId)).limit(1))[0]
  if (!driver) throw new Error("Driver profile not found")
  const qr = (await db.select().from(taxiQr).where(eq(taxiQr.driverProfileId, driverProfileId)).orderBy(desc(taxiQr.createdAt)).limit(1))[0] ?? null
  const rows = await db.select().from(transaction).where(eq(transaction.driverProfileId, driverProfileId)).orderBy(desc(transaction.createdAt)).limit(50)
  const successful = rows.filter((r) => r.status === "SUCCESS")
  const total = successful.reduce((sum, r) => sum + Number(r.amount), 0)
  return { driver, qr, transactions: rows, total, count: successful.length }
}

export function assertDriverOwnsQr(qr: { driverProfileId: string }, driverProfileId: string) {
  if (qr.driverProfileId !== driverProfileId) throw new Error("Forbidden")
}

export function assertDriverOwnsTransaction(row: { driverProfileId: string }, driverProfileId: string) {
  if (row.driverProfileId !== driverProfileId) throw new Error("Forbidden")
}

export { transaction }
