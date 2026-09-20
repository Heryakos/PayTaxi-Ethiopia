// Shared TypeScript types used across the web app and (in a full monorepo) the
// React Native mobile app. In the monorepo layout described in the spec this
// file would live at /packages/shared/src/types.ts and be imported by both
// /apps/web and /apps/mobile.

export type UserRole = "PASSENGER" | "DRIVER" | "ADMIN"

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED"

export type QrStatus = "ACTIVE" | "DISABLED" | "REPLACED"

export type TransactionStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED"
  | "UNKNOWN"

/** Public, non-sensitive driver info shown on the payment screen. */
export type PublicDriverInfo = {
  taxiId: string
  displayName: string
  plateNumber: string
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleColor: string | null
  profilePhotoUrl: string | null
  rating: number
  qrStatus: QrStatus
}

export type TransactionSummary = {
  id: string
  taxiId: string
  amount: number
  currency: string
  status: TransactionStatus
  createdAt: string
  confirmedAt: string | null
}

export type DriverDashboard = {
  driver: PublicDriverInfo
  today: { total: number; count: number; average: number }
  week: { total: number; count: number; series: { label: string; total: number }[] }
  month: { total: number; count: number }
  recent: TransactionSummary[]
  payoutStatus: "SETTLED" | "PENDING_SETTLEMENT"
}
