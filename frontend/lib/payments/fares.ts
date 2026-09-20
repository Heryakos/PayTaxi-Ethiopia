import type { TransactionStatus } from "@/lib/shared/types"

// Server-authoritative fare presets. The passenger may only choose a preset id;
// the amount is never taken from the client. This prevents a tampered client
// from submitting an arbitrary or zero amount.
export const FARE_PRESETS = [
  { id: "short", label: "Short trip", amount: 80 },
  { id: "standard", label: "Standard", amount: 150 },
  { id: "medium", label: "Medium", amount: 220 },
  { id: "long", label: "Long trip", amount: 300 },
  { id: "airport", label: "Airport", amount: 450 },
] as const

export type FarePresetId = (typeof FARE_PRESETS)[number]["id"]

export function resolveFare(presetId: string) {
  const preset = FARE_PRESETS.find((p) => p.id === presetId)
  if (!preset) return null
  return { amount: preset.amount, currency: "ETB", label: preset.label, id: preset.id }
}

// Explicit transaction state machine. A transaction starts PENDING and may only
// move to a terminal-ish state through an allowed edge. Illegal transitions are
// rejected server-side so a late/duplicate/out-of-order webhook cannot, for
// example, flip an already-SUCCESS payment to FAILED.
const ALLOWED: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ["SUCCESS", "FAILED", "REFUNDED", "UNKNOWN"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
  UNKNOWN: ["SUCCESS", "FAILED", "REFUNDED"],
}

export function canTransition(from: TransactionStatus, to: TransactionStatus) {
  if (from === to) return false
  return ALLOWED[from]?.includes(to) ?? false
}
