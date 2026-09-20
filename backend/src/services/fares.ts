type TransactionStatus = string;

export const FARE_PRESETS = [
  { id: "short", label: "Short trip", amount: 80 },
  { id: "standard", label: "Standard", amount: 150 },
  { id: "medium", label: "Medium", amount: 220 },
  { id: "long", label: "Long trip", amount: 300 },
  { id: "airport", label: "Airport", amount: 450 },
] as const;

export type FarePresetId = (typeof FARE_PRESETS)[number]["id"];

export function resolveFare(presetId: string) {
  const preset = FARE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return { amount: preset.amount, currency: "ETB", label: preset.label, id: preset.id };
}

const ALLOWED: Record<TransactionStatus, TransactionStatus[]> = {
  PENDING: ["SUCCESS", "FAILED", "REFUNDED", "UNKNOWN"],
  SUCCESS: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
  UNKNOWN: ["SUCCESS", "FAILED", "REFUNDED"],
};

export function canTransition(from: TransactionStatus, to: TransactionStatus) {
  if (from === to) return false;
  return ALLOWED[from]?.includes(to) ?? false;
}
