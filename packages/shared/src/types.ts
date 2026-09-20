export type UserRole = "PASSENGER" | "DRIVER" | "ADMIN"
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED"
export type QrStatus = "ACTIVE" | "DISABLED" | "REPLACED"
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "UNKNOWN"

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

export const FARE_PRESETS = [
  { id: "short", label: "Short trip", amount: 80 },
  { id: "standard", label: "Standard", amount: 150 },
  { id: "medium", label: "Medium", amount: 220 },
  { id: "long", label: "Long trip", amount: 300 },
  { id: "airport", label: "Airport", amount: 450 },
] as const

export type FarePresetId = (typeof FARE_PRESETS)[number]["id"]
