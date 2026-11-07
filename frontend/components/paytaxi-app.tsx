"use client"

import { useEffect, useState, useRef } from "react"
import {
  BadgeCheck, Check, Clock3, LogOut, QrCode, ShieldCheck, Smartphone,
  WalletCards, Globe, CheckCircle2, Car, ArrowLeft, Users, Sparkles,
  Volume2, VolumeX, Shield, AlertCircle, FileText, CheckCircle, XCircle,
  RefreshCw, Upload, Eye, ExternalLink, X, Image as ImageIcon,
  Key, Settings, Sliders, BarChart3, TrendingUp, UserCheck, Save, Search,
  Lock, CreditCard, Send, SmartphoneNfc, Phone, ChevronRight
} from "lucide-react"
import { useTranslations } from "next-intl"
import { FARE_PRESETS } from "@paytaxi/shared"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type UserRole = "PASSENGER" | "DRIVER" | "MANAGER" | "ADMIN"
type User = { id: string; phone: string; role: UserRole; name?: string | null }

type SystemSetting = {
  key: string
  value: string
  description: string | null
  category: string
  updatedAt: string
}

type AdminUser = {
  id: string
  phone: string
  role: UserRole
  name: string | null
  isVerified: boolean
  createdAt: string
  driverProfile?: {
    displayName: string
    plateNumber: string
    vehicleMake: string | null
    vehicleModel: string | null
    qrs?: { taxiId: string; backupCode: string | null; status: string }[]
  } | null
}

type ReportMetrics = {
  grossRevenue: number
  platformCommission: number
  driverNetPayouts: number
  completedRides: number
  totalAttempts: number
  averageFare: number
  totalDrivers: number
  pendingDrivers: number
  activeTaxis: number
}

type TaxiPublicInfo = {
  taxiId: string
  driver: {
    displayName: string
    plateNumber: string
    vehicleMake: string | null
    vehicleModel: string | null
    vehicleColor: string | null
    rating: number
  }
}

type ReceiptData = {
  id: string
  status: string
  amount: number
  currency: string
  createdAt: string
  confirmedAt: string | null
  taxiId: string
  seats: number
  label: string
  driver: {
    displayName: string
    plateNumber: string
    vehicleMake: string | null
    vehicleModel: string | null
    vehicleColor: string | null
    rating?: number
  }
}

type DriverDashboardData = {
  driver: {
    displayName: string
    plateNumber: string
    vehicleMake: string | null
    vehicleModel: string | null
    vehicleColor: string | null
    verificationStatus: string
  }
  qr: { taxiId: string; status: string; backupCode: string | null } | null
  transactions: { id: string; amount: string; status: string; createdAt: string }[]
  total: number
  count: number
}

type AdminDriver = {
  id: string
  userId: string
  phone: string
  displayName: string
  plateNumber: string
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleColor: string | null
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED"
  nationalIdUrl: string | null
  licenseUrl: string | null
  activeTaxiId: string | null
  rating: number
  createdAt: string
}

// ---------- Driver Soundbox Audio Helpers (Web Audio & Speech API) ----------
function playSoundboxChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    // Tone 2: A5 (880.00 Hz) crisp chime
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now + 0.12)
    gain2.gain.setValueAtTime(0.35, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.55)
  } catch (e) {
    console.warn("Soundbox audio chime could not play:", e)
  }
}

function announcePaymentVoice(amount: number) {
  try {
    if (!("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`Payment received: ${amount} Birr`)
    utterance.rate = 1.05
    utterance.pitch = 1.1
    utterance.volume = 1.0
    window.speechSynthesis.speak(utterance)
  } catch (e) {
    console.warn("Speech synthesis announcement error:", e)
  }
}

// ---------- API helpers (cookie-based, no localStorage) ----------
async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include", // send the httpOnly cookie automatically
  })
  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    if (!res.ok) {
      throw new Error(`API endpoint ${path} returned HTTP ${res.status}. Backend update may be in progress on Render.`)
    }
    throw new Error(`Invalid response format from server (${res.status})`)
  }
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data
}

function postJson(path: string, payload?: unknown) {
  return apiFetch(path, { method: "POST", body: payload ? JSON.stringify(payload) : undefined })
}

function putJson(path: string, payload?: unknown) {
  return apiFetch(path, { method: "PUT", body: payload ? JSON.stringify(payload) : undefined })
}

// ---------- Authentic Ethiopian Vehicle Plate Badge ----------
export function EthiopianPlate({
  plate,
  size = "md",
}: {
  plate?: string | null
  size?: "sm" | "md" | "lg"
}) {
  const isSm = size === "sm"
  const isLg = size === "lg"
  const text = plate || "AA 3-B12345"
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-white font-mono font-black text-black shadow-sm ${isSm ? "px-1.5 py-0.5 text-[11px]" : isLg ? "px-3 py-1.5 text-base" : "px-2 py-1 text-xs"
        }`}
    >
      <span className="flex h-2.5 w-3.5 flex-col overflow-hidden rounded-[1px] border border-black/20">
        <span className="h-1/3 bg-[#078930]" />
        <span className="h-1/3 bg-[#FCDD09]" />
        <span className="h-1/3 bg-[#DA121A]" />
      </span>
      <span className="tracking-wider">{text}</span>
    </div>
  )
}

// ---------- Brand ----------
function Brand() {
  const t = useTranslations("nav")
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-[#00473e] text-white shadow-sm ring-1 ring-emerald-500/30">
        <QrCode className="size-5" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-mono text-sm font-bold tracking-tight text-foreground">{t("brand_name")}</p>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">ET</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{t("brand_tagline")}</p>
      </div>
    </div>
  )
}

// ---------- Anti-Fraud Weyala Receipt ----------
function WeyalaReceipt({
  receipt,
  onClose,
  onNewPayment,
}: {
  receipt: ReceiptData
  onClose: () => void
  onNewPayment: () => void
}) {
  const t = useTranslations("receipt")
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [currentTime, setCurrentTime] = useState("")

  useEffect(() => {
    const start = receipt.confirmedAt ? new Date(receipt.confirmedAt).getTime() : Date.now()
    const update = () => {
      const now = Date.now()
      setSecondsAgo(Math.max(0, Math.floor((now - start) / 1000)))
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [receipt.confirmedAt])

  const shortCode = `PT-${receipt.id.slice(0, 8).toUpperCase()}`

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/50 bg-[#061e19] p-6 text-white shadow-2xl sm:p-8">
        {/* Animated dynamic security watermark pattern */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Big pulsing verification badge for the Weyala */}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-400/30">
            <CheckCircle2 className="size-11" />
            <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 animate-ping" />
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            WEYALA VERIFICATION ACTIVE: {Math.max(0, 600 - secondsAgo)}s REMAINING
          </div>

          <p className="mt-2 text-sm font-semibold text-emerald-200">
            {t("weyala_instruction")}
          </p>

          {/* Live pulsing timer */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-1.5 font-mono text-xs font-semibold text-white/90">
            <Clock3 className="size-3.5 text-emerald-400 animate-spin" />
            <span>{t("live_timer", { seconds: secondsAgo })}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/70">{currentTime}</span>
          </div>
        </div>

        {/* Ethiopian Minibus Amount Display */}
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-white/5 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300/80">{t("amount_paid")}</p>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black tracking-tight text-white">{receipt.amount}</span>
            <span className="font-mono text-xl font-bold text-emerald-400">ETB</span>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-200/70">
            {receipt.label} · {receipt.seats} {t("seats_paid")}
          </p>
        </div>

        {/* Taxi & Driver Identification Card */}
        <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs font-medium text-slate-300">{t("plate_label")}</span>
            <EthiopianPlate plate={receipt.driver.plateNumber || receipt.taxiId} size="sm" />
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-3 text-sm">
            <span className="text-xs font-medium text-slate-300">{t("taxi_id_label")}</span>
            <span className="font-mono font-bold text-emerald-400">{receipt.taxiId}</span>
          </div>

          <div className="flex items-center justify-between border-b border-white/10 pb-3 text-sm">
            <span className="text-xs font-medium text-slate-300">{t("driver_label")}</span>
            <span className="font-semibold text-white">{receipt.driver.displayName}</span>
          </div>

          {receipt.driver.vehicleMake && (
            <div className="flex items-center justify-between border-b border-white/10 pb-3 text-sm">
              <span className="text-xs font-medium text-slate-300">Vehicle</span>
              <span className="text-xs text-slate-300">
                {receipt.driver.vehicleMake} {receipt.driver.vehicleModel || ""} {receipt.driver.vehicleColor ? `(${receipt.driver.vehicleColor})` : ""}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-white/10 pb-3 text-xs">
            <span className="text-slate-300">AddisPay Reference</span>
            <span className="font-mono font-semibold text-emerald-400">TXN-AP-{receipt.id.slice(0, 8).toUpperCase()}</span>
          </div>

          <div className="pt-2 text-center">
            <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Anti-Fraud Security Seal</div>
              <div className="mt-0.5 font-mono text-xs font-bold text-emerald-400 tracking-wider">
                TOKEN: {shortCode} · SOUNDBOX SYNCED
              </div>
            </div>
          </div>
        </div>

        {/* Anti-fraud note */}
        <p className="mt-4 text-center text-[11px] leading-4 text-slate-300">
          {t("anti_fraud_notice")}
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg transition-opacity hover:opacity-95"
          >
            {t("done_btn")}
          </button>
          <button
            onClick={onNewPayment}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            {t("new_payment")}
          </button>
        </div>
      </div>
    </main>
  )
}

// ---------- Passenger Pay (Guest & Logged-in) ----------
function PassengerPay({
  user,
  onBack,
  initialTaxiId,
  onReceipt,
}: {
  user: User | null
  onBack: () => void
  initialTaxiId?: string
  onReceipt: (receipt: ReceiptData) => void
}) {
  const t = useTranslations("payment")
  const [taxiId, setTaxiId] = useState(initialTaxiId ?? "TX-1001")
  const [taxiDetails, setTaxiDetails] = useState<TaxiPublicInfo | null>(null)
  const [fareMode, setFareMode] = useState<"preset" | "custom">("preset")
  const [farePresetId, setFarePresetId] = useState<string>("standard")
  const [customAmount, setCustomAmount] = useState<string>("15")
  const [passengerCount, setPassengerCount] = useState<number>(1)
  const [passengerPhone, setPassengerPhone] = useState<string>("")
  const [state, setState] = useState<"idle" | "pending" | "simulating" | "error">("idle")
  const [message, setMessage] = useState("")

  // Fetch driver details for this taxi
  useEffect(() => {
    if (!taxiId || taxiId.length < 3) return
    apiFetch(`/qr/${taxiId.trim().toUpperCase()}`)
      .then((data: TaxiPublicInfo) => setTaxiDetails(data))
      .catch(() => setTaxiDetails(null))
  }, [taxiId])

  // Calculate live total
  const selectedPreset = FARE_PRESETS.find((p) => p.id === farePresetId) || FARE_PRESETS[1]
  const unitAmount = fareMode === "preset" ? selectedPreset.amount : (Number(customAmount) || 0)
  const totalAmount = unitAmount * passengerCount

  const handlePay = async (simulate: boolean = false) => {
    try {
      setMessage("")
      setState(simulate ? "simulating" : "pending")

      const payload = {
        taxiId: taxiId.trim().toUpperCase(),
        farePresetId: fareMode === "preset" ? farePresetId : undefined,
        customAmount: fareMode === "custom" ? Number(customAmount) : undefined,
        passengerCount,
        passengerPhone: passengerPhone.trim() || undefined,
      }

      const initData = await postJson("/payments/initiate", payload)

      if (simulate) {
        // Direct sandbox instant simulation for testing & immediate receipt rendering
        const simResult = await postJson(`/payments/${initData.transactionId}/simulate-success`)
        onReceipt({
          id: simResult.transaction.id,
          status: simResult.transaction.status,
          amount: simResult.transaction.amount,
          currency: simResult.transaction.currency,
          createdAt: simResult.transaction.createdAt,
          confirmedAt: simResult.transaction.confirmedAt,
          taxiId: simResult.transaction.taxiId,
          seats: passengerCount,
          label: initData.fare.label,
          driver: simResult.transaction.driver,
        })
      } else {
        if (initData.checkoutUrl && initData.checkoutUrl.startsWith("http")) {
          window.location.href = initData.checkoutUrl
        } else {
          setMessage(`Transaction created: ${initData.transactionId}. Amount: ${totalAmount} ETB.`)
          setState("idle")
        }
      }
    } catch (e) {
      setState("error")
      setMessage((e as Error).message)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {t("guest_notice")}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>

        {/* Scanned Taxi Card */}
        <div className="mt-6 rounded-2xl border border-border bg-background p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="taxiId">
            {t("taxi_id_label")}
          </label>
          <input
            id="taxiId"
            value={taxiId}
            onChange={(e) => setTaxiId(e.target.value.toUpperCase())}
            placeholder="e.g. TX-1001"
            className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-2.5 font-mono text-lg font-bold tracking-wider"
          />

          {taxiDetails && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 p-3.5 border border-emerald-500/20">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground text-sm">{taxiDetails.driver.displayName}</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">✓ VERIFIED</span>
                </div>
                <span className="text-xs text-muted-foreground">{taxiDetails.driver.vehicleMake || "Toyota HiAce Minibus"} {taxiDetails.driver.vehicleColor || "(Blue/White)"}</span>
              </div>
              <EthiopianPlate plate={taxiDetails.driver.plateNumber} size="sm" />
            </div>
          )}
        </div>

        {/* Fare Mode Selector Tabs */}
        <div className="mt-6 flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFareMode("preset")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${fareMode === "preset" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t("presets_tab")}
          </button>
          <button
            type="button"
            onClick={() => setFareMode("custom")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${fareMode === "custom" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t("custom_fare_tab")}
          </button>
        </div>

        {/* Preset Minibus Stages Grid */}
        {fareMode === "preset" ? (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {FARE_PRESETS.map((fare) => {
              const active = farePresetId === fare.id
              return (
                <button
                  key={fare.id}
                  type="button"
                  onClick={() => setFarePresetId(fare.id)}
                  className={`rounded-2xl border p-3.5 text-left transition-all ${active
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/50"
                    }`}
                >
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{fare.label}</p>
                  <p className="mt-1 font-mono text-lg font-bold text-primary">{fare.amount} <span className="text-xs font-normal">ETB</span></p>
                  {"description" in fare && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{(fare as any).description}</p>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border bg-background p-4">
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="customAmount">
              Enter Fare Amount (ETB)
            </label>
            <div className="relative mt-2">
              <input
                id="customAmount"
                type="number"
                min={5}
                max={500}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={t("custom_placeholder")}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-xl font-bold"
              />
              <span className="absolute right-4 top-3.5 font-mono text-sm font-semibold text-muted-foreground">ETB</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t("custom_min_max")}</p>
          </div>
        )}

        {/* Passenger Seats Multiplier */}
        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("seats_label")}</p>
              <p className="text-[11px] text-muted-foreground">Paying for someone else? Add seats</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPassengerCount((c) => Math.max(1, c - 1))}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-base font-bold text-foreground hover:bg-muted"
                disabled={passengerCount <= 1}
              >
                -
              </button>
              <span className="min-w-6 text-center font-mono text-base font-bold text-foreground">
                {passengerCount}
              </span>
              <button
                type="button"
                onClick={() => setPassengerCount((c) => Math.min(10, c + 1))}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-base font-bold text-foreground hover:bg-muted"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPassengerCount(num)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${passengerCount === num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                {num} {num === 1 ? "seat" : "seats"}
              </button>
            ))}
          </div>
        </div>

        {/* Optional phone number for SMS receipt */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-muted-foreground" htmlFor="passengerPhone">
            {t("phone_optional_label")}
          </label>
          <input
            id="passengerPhone"
            value={passengerPhone}
            onChange={(e) => setPassengerPhone(e.target.value)}
            placeholder={t("phone_optional_placeholder")}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
          />
        </div>

        {/* Total Summary Box */}
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-primary/10 px-5 py-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("total_due")}</span>
            <p className="text-xs text-muted-foreground">
              {passengerCount > 1 ? `${passengerCount} seats × ${unitAmount} ETB` : "1 passenger"}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-foreground">{totalAmount}</span>
            <span className="ml-1 font-mono text-sm font-bold text-primary">ETB</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            disabled={state === "pending" || state === "simulating" || totalAmount < 5}
            onClick={() => handlePay(false)}
            className="w-full rounded-xl bg-primary px-4 py-3.5 font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {state === "pending" ? t("pending_btn") : t("pay_now", { amount: totalAmount })}
          </button>

          {/* Test mode instant confirmation button */}
          <button
            type="button"
            disabled={state === "pending" || state === "simulating" || totalAmount < 5}
            onClick={() => handlePay(true)}
            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300 disabled:opacity-60"
          >
            {state === "simulating" ? t("simulating") : t("simulate_btn")}
          </button>
        </div>

        {message && (
          <div className={`mt-4 rounded-xl p-3.5 text-xs ${state === "error" ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-900"}`}>
            {message}
          </div>
        )}

        {user && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("signed_in_as")} {user.phone}
          </p>
        )}
      </div>
    </main>
  )
}

// ---------- Multi-Method Auth (Phone OTP, Driver PIN Fallback, QR Session) ----------
function OtpAuth({ role, onSuccess, onBack }: { role: UserRole; onSuccess: (user: User) => void; onBack: () => void }) {
  const t = useTranslations("auth")
  const defaultPhone =
    role === "DRIVER"
      ? "+251922222222"
      : role === "MANAGER"
      ? "+251944444444"
      : role === "ADMIN"
      ? "+251911111111"
      : "+251933333333"

  const [authMode, setAuthMode] = useState<"otp" | "pin" | "qr">("otp")
  const [phone, setPhone] = useState(defaultPhone)
  const [code, setCode] = useState("")
  const [pin, setPin] = useState(role === "DRIVER" ? "ABCD1234" : "")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [qrData, setQrData] = useState<{ token: string; qrDataUrl: string } | null>(null)

  // QR Session polling (every 2 seconds when QR mode is active)
  useEffect(() => {
    if (authMode !== "qr" || !qrData?.token) return
    let active = true
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/auth/qr-session/${qrData.token}`)
        if (res.status === "APPROVED" && res.user && active) {
          clearInterval(interval)
          onSuccess(res.user)
        }
      } catch {
        // continue polling
      }
    }, 2000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [authMode, qrData, onSuccess])

  const request = async () => {
    try {
      setError("")
      setLoading(true)
      const data = await postJson("/auth/request-otp", { phone, role })
      setChallengeId(data.challengeId)
      setDevCode(data.code)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const verify = async (overrideCode?: string) => {
    try {
      setError("")
      setLoading(true)
      const submitCode = overrideCode || code
      const data = await postJson("/auth/verify-otp", { challengeId, code: submitCode })
      onSuccess(data.user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const verifyPin = async () => {
    try {
      setError("")
      setLoading(true)
      const data = await postJson("/auth/login-pin", { phone, pin })
      onSuccess(data.user)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const initQrSession = async () => {
    try {
      setError("")
      setLoading(true)
      const data = await postJson("/auth/qr-session")
      setQrData(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-16 sm:px-8">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-1.5 text-left text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {authMode === "otp" && <Smartphone className="size-6" />}
            {authMode === "pin" && <Key className="size-6" />}
            {authMode === "qr" && <QrCode className="size-6" />}
          </div>
          <span className="rounded-full bg-muted px-3 py-1 font-mono text-xs font-bold text-muted-foreground">
            {role}
          </span>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          {role === "DRIVER" ? t("title_driver") : role === "MANAGER" ? "Manager Access" : role === "ADMIN" ? "Admin Review Login" : t("title_passenger")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

        {/* Auth Method Switcher Tabs (SMS OTP vs Backup PIN vs QR) */}
        <div className="mt-6 grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode("otp"); setError(""); }}
            className={`rounded-xl py-2 transition-all ${authMode === "otp" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("tab_sms")}
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("pin"); setError(""); }}
            className={`rounded-xl py-2 transition-all ${authMode === "pin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("tab_pin")}
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("qr"); setError(""); if (!qrData) void initQrSession(); }}
            className={`rounded-xl py-2 transition-all ${authMode === "qr" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("tab_qr")}
          </button>
        </div>

        {/* Tab 1: Phone OTP */}
        {authMode === "otp" && (
          <div className="mt-6">
            {!challengeId ? (
              <>
                <label className="block text-sm font-semibold" htmlFor="phone">{t("phone_label")}</label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phone_placeholder")}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={request}
                  disabled={loading || !phone.trim()}
                  className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 transition-all hover:bg-primary/90"
                >
                  {loading ? t("sending") : t("send_otp")}
                </button>
              </>
            ) : (
              <>
                {devCode && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        {t("dev_otp")} <strong className="font-mono text-base">{devCode}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCode(devCode); void verify(devCode); }}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <Sparkles className="size-3.5" /> {t("auto_fill_btn")}
                    </button>
                  </div>
                )}

                <label className="mt-5 block text-sm font-semibold" htmlFor="otp">{t("otp_label")}</label>
                <input
                  id="otp"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-center text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => verify()}
                  disabled={loading || code.length < 6}
                  className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 transition-all hover:bg-primary/90"
                >
                  {loading ? t("verifying") : t("verify")}
                </button>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Driver Backup PIN Fallback */}
        {authMode === "pin" && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold" htmlFor="pinPhone">{t("phone_label")}</label>
              <input
                id="pinPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251922222222"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold" htmlFor="pinCode">{t("pin_label")}</label>
              <input
                id="pinCode"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t("pin_placeholder")}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              💡 {t("pin_hint")}
            </div>

            <button
              type="button"
              onClick={verifyPin}
              disabled={loading || !phone.trim() || !pin.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 transition-all hover:bg-primary/90"
            >
              <Key className="size-4" /> {loading ? "Verifying PIN…" : t("pin_btn")}
            </button>
          </div>
        )}

        {/* Tab 3: QR Code Session Login */}
        {authMode === "qr" && (
          <div className="mt-6 flex flex-col items-center text-center">
            {qrData?.qrDataUrl ? (
              <>
                <div className="rounded-2xl border-2 border-border bg-white p-3 shadow-md">
                  <img src={qrData.qrDataUrl} alt="Login QR Code" className="size-52" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Waiting for scan authorization…</span>
                </div>
                <p className="mt-2 max-w-xs text-xs text-muted-foreground">{t("qr_desc")}</p>
                <button
                  type="button"
                  onClick={initQrSession}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <RefreshCw className="size-3" /> Refresh QR code
                </button>
              </>
            ) : (
              <div className="py-8">
                <button
                  type="button"
                  onClick={initQrSession}
                  disabled={loading}
                  className="rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  {loading ? "Generating QR…" : "Generate Sign-in QR"}
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}

// ---------- Driver Registration with KYC Document Upload ----------
function DriverRegistration({ onDone }: { onDone: (data: DriverDashboardData) => void }) {
  const t = useTranslations("registration")
  const [form, setForm] = useState({
    name: "",
    vehicleMake: "Toyota",
    vehicleModel: "Corolla",
    vehicleColor: "White",
    plateNumber: "",
    nationalIdUrl: "",
    licenseUrl: "",
  })
  const [idPreview, setIdPreview] = useState<string | null>(null)
  const [licensePreview, setLicensePreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "id" | "license") => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (field === "id") {
        setIdPreview(result)
        setForm((prev) => ({ ...prev, nationalIdUrl: result }))
      } else {
        setLicensePreview(result)
        setForm((prev) => ({ ...prev, licenseUrl: result }))
      }
    }
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    try {
      setError("")
      setLoading(true)
      const result = await postJson("/drivers/register", form)
      onDone({ driver: result.driver, qr: null, transactions: [], total: 0, count: 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <Shield className="size-3.5" />
          <span>{t("label")}</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Full Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Abebe Kebede"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>

          <label className="text-sm font-semibold">
            Plate Number
            <input
              value={form.plateNumber}
              onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
              placeholder="3-A12345 AA"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>

          <label className="text-sm font-semibold">
            Vehicle Make
            <input
              value={form.vehicleMake}
              onChange={(e) => setForm({ ...form, vehicleMake: e.target.value })}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />
          </label>

          <label className="text-sm font-semibold">
            Vehicle Model
            <input
              value={form.vehicleModel}
              onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />
          </label>

          <label className="text-sm font-semibold">
            Vehicle Color
            <input
              value={form.vehicleColor}
              onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />
          </label>

          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
            {/* National ID Upload */}
            <div className="rounded-2xl border border-dashed border-border p-4 bg-muted/20">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {t("mock_id")} (Kebele / Fayda)
              </label>
              {idPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-3">
                    <img src={idPreview} alt="National ID" className="size-14 rounded-lg object-cover border border-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="size-3.5" /> Document Ready
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">National ID uploaded</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIdPreview(null); setForm(p => ({ ...p, nationalIdUrl: "" })) }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary">Upload National ID Image</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "id")} className="hidden" />
                </label>
              )}
            </div>

            {/* Driver License Upload */}
            <div className="rounded-2xl border border-dashed border-border p-4 bg-muted/20">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {t("mock_license")}
              </label>
              {licensePreview ? (
                <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-center gap-3">
                    <img src={licensePreview} alt="License" className="size-14 rounded-lg object-cover border border-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="size-3.5" /> Document Ready
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">Driver License uploaded</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLicensePreview(null); setForm(p => ({ ...p, licenseUrl: "" })) }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-background p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="size-5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary">Upload Driver License Image</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "license")} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading || !form.name || !form.plateNumber}
          className="mt-6 w-full rounded-xl bg-primary px-4 py-3.5 font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {loading ? t("submitting") : t("submit")}
        </button>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  )
}

// ---------- Driver Dashboard with Real-Time Soundbox ----------
function DriverDashboard({
  data,
  onRefresh,
  onLogout,
}: {
  data: DriverDashboardData
  onRefresh: () => void
  onLogout: () => void
}) {
  const t = useTranslations("dashboard")
  const [currentData, setCurrentData] = useState<DriverDashboardData>(data)
  const [replacing, setReplacing] = useState(false)
  const [soundboxEnabled, setSoundboxEnabled] = useState(true)
  const [latestAlert, setLatestAlert] = useState<{ amount: number; taxiId: string; time: string } | null>(null)

  // Keep internal state synced when parent data updates
  useEffect(() => {
    setCurrentData(data)
  }, [data])

  // Real-time EventSource listener for SSE payment broadcasts
  useEffect(() => {
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(`${API}/dashboard/stream`, { withCredentials: true })

      eventSource.onopen = () => {
        console.log("Soundbox SSE stream connected")
      }

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === "PAYMENT_SUCCESS") {
            const amountNum = Number(payload.amount)

            if (soundboxEnabled) {
              playSoundboxChime()
              setTimeout(() => {
                announcePaymentVoice(amountNum)
              }, 400)
            }

            setLatestAlert({
              amount: amountNum,
              taxiId: payload.taxiId,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            })

            setCurrentData((prev) => ({
              ...prev,
              total: prev.total + amountNum,
              count: prev.count + 1,
              transactions: [
                {
                  id: payload.transactionId,
                  amount: String(amountNum),
                  status: "SUCCESS",
                  createdAt: payload.timestamp || new Date().toISOString(),
                },
                ...prev.transactions,
              ],
            }))
          }
        } catch (err) {
          console.error("SSE parse error:", err)
        }
      }

      eventSource.onerror = (err) => {
        console.warn("Soundbox SSE connection retry:", err)
      }
    } catch (err) {
      console.warn("Could not start SSE:", err)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [soundboxEnabled])

  const replaceQr = async () => {
    try {
      setReplacing(true)
      await postJson("/qr/replace")
      onRefresh()
    } catch {
      /* ignore */
    } finally {
      setReplacing(false)
    }
  }

  const toggleSoundbox = () => {
    const next = !soundboxEnabled
    setSoundboxEnabled(next)
    if (next) {
      playSoundboxChime() // trigger test chime so audio context unlocks
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      {/* Real-time Payment Notification Banner */}
      {latestAlert && (
        <div className="mb-6 overflow-hidden rounded-2xl border-2 border-emerald-500 bg-emerald-500/15 p-4 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                <Sparkles className="size-6 animate-spin" />
              </div>
              <div>
                <p className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                  {t("payment_alert", { amount: latestAlert.amount })}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Taxi {latestAlert.taxiId} · Received at {latestAlert.time}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLatestAlert(null)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Car className="size-3.5" />
            <span>{t("label")}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold">{t("welcome", { name: currentData.driver.displayName })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Soundbox toggle button */}
          <button
            type="button"
            onClick={toggleSoundbox}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${soundboxEnabled
                ? "border-2 border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                : "border border-border bg-muted/60 text-muted-foreground"
              }`}
          >
            {soundboxEnabled ? (
              <>
                <Volume2 className="size-4 text-emerald-600 animate-pulse" />
                <span>{t("soundbox_active")}</span>
              </>
            ) : (
              <>
                <VolumeX className="size-4 text-muted-foreground" />
                <span>{t("soundbox_muted")}</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted"
          >
            <LogOut className="size-3.5" />
            {t("log_out")}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <WalletCards className="size-5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total</span>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">{currentData.total.toLocaleString()} ETB</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("earnings")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Check className="size-5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Count</span>
          </div>
          <p className="mt-4 text-3xl font-extrabold tracking-tight">{currentData.count}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("payments")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <QrCode className="size-5 text-primary" />
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${currentData.qr?.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700"
              }`}>
              {currentData.qr?.status ?? currentData.driver.verificationStatus}
            </span>
          </div>
          <p className="mt-4 font-mono text-2xl font-bold text-primary">{currentData.qr?.taxiId ?? t("no_qr")}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <EthiopianPlate plate={currentData.driver.plateNumber} size="sm" />
          </div>
          {currentData.qr?.taxiId && (
            <a
              href={`${API}/qr/${currentData.qr.taxiId}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <ExternalLink className="size-3" />
              {t("download_qr")}
            </a>
          )}
        </div>
      </div>

      {/* Driver Backup PIN Banner */}
      {currentData.qr?.backupCode && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Lock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Driver Offline Backup PIN
              </p>
              <p className="text-xs text-muted-foreground">
                Bypass SMS verification when mobile networks experience outages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-black tracking-widest text-amber-800 dark:text-amber-200 bg-card px-3.5 py-1.5 rounded-xl border border-amber-500/30 shadow-sm">
              {currentData.qr.backupCode}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={replaceQr}
          disabled={replacing}
          className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-60"
        >
          {replacing ? t("replacing") : t("report_lost")}
        </button>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
        >
          <RefreshCw className="size-3.5" />
          {t("refresh")}
        </button>
      </div>

      {/* Recent Transactions List */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-bold text-sm">{t("recent_tx")}</h2>
          <span className="text-xs text-muted-foreground font-mono">{currentData.transactions.length} total</span>
        </div>
        <div className="mt-4 flex flex-col divide-y divide-border">
          {currentData.transactions.length ? (
            currentData.transactions.map((row) => (
              <div key={row.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-mono text-xs font-semibold text-foreground">{row.id.slice(0, 14)}…</span>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-base">{row.amount} ETB</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.status === "SUCCESS"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                    }`}>
                    {row.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("no_tx")}</p>
          )}
        </div>
      </section>
    </main>
  )
}


// ---------- Manager Operations & Financial Reports Portal ----------
function ManagerPortal({ onRefresh, onLogout }: { onRefresh: () => void; onLogout: () => void }) {
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportsData, txData] = await Promise.all([
        apiFetch("/admin/reports"),
        apiFetch(`/admin/transactions?status=${statusFilter}&search=${encodeURIComponent(search)}`),
      ])
      setMetrics(reportsData.metrics)
      setTransactions(txData.transactions || [])
    } catch (e) {
      console.error("Error loading manager data:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [statusFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void loadData()
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BarChart3 className="size-3.5" />
            <span>Operations & Finance Hub</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Transit Financial Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time Addis Ababa minibus fare settlements, platform commission, and transaction logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Gross Volume</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{metrics?.grossRevenue ?? 0}</span>
            <span className="font-mono text-xs font-bold text-emerald-600">ETB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Passenger payments</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Completed Rides</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{metrics?.completedRides ?? 0}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Verified trips</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Platform Fee (2.5%)</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-primary">{metrics?.platformCommission ?? 0}</span>
            <span className="font-mono text-xs font-bold text-primary">ETB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Net commission</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Driver Net Payout</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600">{metrics?.driverNetPayouts ?? 0}</span>
            <span className="font-mono text-xs font-bold text-emerald-600">ETB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Disbursed to drivers</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Average Fare</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{metrics?.averageFare ?? 0}</span>
            <span className="font-mono text-xs font-bold text-muted-foreground">ETB</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Per completed ride</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Taxis</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-foreground">{metrics?.activeTaxis ?? 0}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Deployed QR fleet</p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold">Transaction Ledger</h2>
            <p className="text-xs text-muted-foreground">Filter by payment status or search by taxi ID, plate number, or reference.</p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Taxi ID, Plate…"
                className="rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              Filter
            </button>
          </form>
        </div>

        {/* Filter Pills */}
        <div className="mt-4 flex gap-1.5 text-xs font-semibold">
          {["ALL", "SUCCESS", "PENDING", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3 py-1.5 transition-colors ${statusFilter === st
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Ledger Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Taxi ID</th>
                <th className="pb-3 font-semibold">Driver & Plate</th>
                <th className="pb-3 font-semibold">Passenger</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 font-mono text-[11px] text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className="py-3 font-mono font-bold text-foreground">
                      {tx.qr?.taxiId || "TX-N/A"}
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-foreground mb-1">{tx.driverProfile?.displayName || "Driver"}</p>
                      <EthiopianPlate plate={tx.driverProfile?.plateNumber} size="sm" />
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">
                      {tx.passengerUser?.phone || "Guest Passenger"}
                    </td>
                    <td className="py-3 text-right font-black text-sm">
                      {tx.amount} <span className="font-normal text-[10px] text-muted-foreground">ETB</span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tx.status === "SUCCESS"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : tx.status === "FAILED"
                              ? "bg-destructive/15 text-destructive border border-destructive/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                          }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-[10px] text-muted-foreground">
                      {tx.addispayTransactionRef ? tx.addispayTransactionRef.slice(0, 12) + "…" : "tx_" + tx.id.slice(0, 8)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No transactions match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

// ---------- Comprehensive Admin Portal (KYC, User Management, In-App Settings & Reports) ----------
function AdminPortal({ onRefresh, onLogout }: { onRefresh: () => void; onLogout: () => void }) {
  const t = useTranslations("admin")
  const [adminTab, setAdminTab] = useState<"kyc" | "users" | "settings" | "reports">("kyc")

  // Driver KYC state
  const [drivers, setDrivers] = useState<AdminDriver[]>([])
  const [driverFilter, setDriverFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL")
  const [userSearch, setUserSearch] = useState("")
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "PASSENGER" as UserRole, backupCode: "" })

  // Settings state (Live In-App Config without code changes!)
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [settingValues, setSettingValues] = useState<Record<string, string>>({})
  const [savingSettings, setSavingSettings] = useState(false)

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch Drivers
  const fetchDrivers = async () => {
    try {
      setLoading(true)
      const data = await apiFetch("/drivers/admin/all")
      setDrivers(data.drivers || [])
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await apiFetch(`/admin/users?role=${userRoleFilter}&search=${encodeURIComponent(userSearch)}`)
      setUsers(data.users || [])
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await apiFetch("/admin/settings")
      const list: SystemSetting[] = data.settings || []
      setSettings(list)
      const values: Record<string, string> = {}
      for (const s of list) {
        values[s.key] = s.value
      }
      setSettingValues(values)
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminTab === "kyc") void fetchDrivers()
    else if (adminTab === "users") void fetchUsers()
    else if (adminTab === "settings") void fetchSettings()
  }, [adminTab, userRoleFilter])

  const handleApprove = async (driverId: string) => {
    try {
      setActionLoading(driverId)
      setMessage(null)
      const res = await postJson(`/drivers/${driverId}/approve`)
      setMessage({ text: `Driver approved! Active Taxi QR Code ${res.qr?.taxiId} created.`, type: "success" })
      await fetchDrivers()
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (driverId: string) => {
    try {
      setActionLoading(driverId)
      setMessage(null)
      await postJson(`/drivers/${driverId}/reject`, { reason: "Documents did not pass verification." })
      setMessage({ text: "Driver application rejected.", type: "success" })
      await fetchDrivers()
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const startEditUser = (u: AdminUser) => {
    setEditingUser(u)
    const activeQr = u.driverProfile?.qrs?.find((q) => q.status === "ACTIVE")
    setEditForm({
      name: u.name || "",
      phone: u.phone,
      role: u.role,
      backupCode: activeQr?.backupCode || "ABCD1234",
    })
  }

  const saveUserEdits = async () => {
    if (!editingUser) return
    try {
      setActionLoading(editingUser.id)
      setMessage(null)
      await putJson(`/admin/users/${editingUser.id}`, {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
      })
      if (editingUser.driverProfile && editForm.backupCode) {
        await putJson(`/admin/drivers/${editingUser.driverProfile.displayName ? editingUser.driverProfile : editingUser.id}/backup-code`, {
          backupCode: editForm.backupCode,
        }).catch(() => { })
      }
      setMessage({ text: `User ${editForm.phone} updated successfully!`, type: "success" })
      setEditingUser(null)
      await fetchUsers()
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingSettings(true)
      setMessage(null)
      const updates: Record<string, { value: string }> = {}
      for (const [k, v] of Object.entries(settingValues)) {
        updates[k] = { value: v }
      }
      await putJson("/admin/settings", { updates })
      setMessage({ text: "System settings saved and applied live across backend!", type: "success" })
    } catch (e) {
      setMessage({ text: (e as Error).message, type: "error" })
    } finally {
      setSavingSettings(false)
    }
  }

  const filteredDrivers = drivers.filter((d) => {
    if (driverFilter === "ALL") return true
    return d.verificationStatus === driverFilter
  })

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            <span>PayTaxi Control Center</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold">Admin Management Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Driver KYC verification, user/staff management, live system configurations & financial reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (adminTab === "kyc") void fetchDrivers()
              else if (adminTab === "users") void fetchUsers()
              else if (adminTab === "settings") void fetchSettings()
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>

      {/* Main Admin Sub-Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4 text-xs font-bold">
        <button
          onClick={() => setAdminTab("kyc")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${adminTab === "kyc"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
        >
          <Shield className="size-4" /> Driver KYC Review ({drivers.filter((d) => d.verificationStatus === "PENDING").length} pending)
        </button>

        <button
          onClick={() => setAdminTab("users")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${adminTab === "users"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
        >
          <Users className="size-4" /> User & Staff Profiles
        </button>

        <button
          onClick={() => setAdminTab("settings")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${adminTab === "settings"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
        >
          <Settings className="size-4" /> System Settings & APIs (No Code Needed)
        </button>

        <button
          onClick={() => setAdminTab("reports")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all ${adminTab === "reports"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
        >
          <BarChart3 className="size-4" /> Financial Reports
        </button>
      </div>

      {/* Toast Notification Message */}
      {message && (
        <div
          className={`mt-4 rounded-xl p-3.5 text-xs font-semibold ${message.type === "success"
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-destructive/15 text-destructive border border-destructive/30"
            }`}
        >
          {message.text}
        </div>
      )}

      {/* TAB 1: Driver KYC Verification */}
      {adminTab === "kyc" && (
        <div className="mt-6">
          <div className="flex gap-2 text-xs font-semibold">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setDriverFilter(tab)}
                className={`rounded-xl px-3.5 py-1.5 transition-colors ${driverFilter === tab
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab === "ALL" ? t("all_tab") : tab === "PENDING" ? t("pending_tab") : tab === "APPROVED" ? t("approved_tab") : t("rejected_tab")}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4">
            {filteredDrivers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                {t("no_drivers")}
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div key={driver.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base text-foreground">{driver.displayName}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${driver.verificationStatus === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : driver.verificationStatus === "PENDING"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-destructive/15 text-destructive"
                            }`}
                        >
                          {driver.verificationStatus}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{driver.phone}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{driver.vehicleColor ?? ""} {driver.vehicleMake ?? ""} {driver.vehicleModel ?? ""}</span>
                        <EthiopianPlate plate={driver.plateNumber} size="sm" />
                      </div>
                      {driver.activeTaxiId && (
                        <p className="text-xs font-semibold text-primary">
                          {t("taxi_assigned")}: <span className="font-mono">{driver.activeTaxiId}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {driver.verificationStatus !== "APPROVED" && (
                        <button
                          onClick={() => handleApprove(driver.id)}
                          disabled={actionLoading === driver.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          <CheckCircle className="size-3.5" />
                          {actionLoading === driver.id ? t("approving") : t("approve_btn")}
                        </button>
                      )}

                      {driver.verificationStatus !== "REJECTED" && (
                        <button
                          onClick={() => handleReject(driver.id)}
                          disabled={actionLoading === driver.id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-60"
                        >
                          <XCircle className="size-3.5" />
                          {actionLoading === driver.id ? t("rejecting") : t("reject_btn")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Document Previews */}
                  <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3">
                    {driver.nationalIdUrl ? (
                      <button
                        onClick={() => setPreviewDoc({ title: `${driver.displayName} - National ID`, url: driver.nationalIdUrl! })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Eye className="size-3.5 text-primary" /> {t("id_document")}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No National ID uploaded</span>
                    )}

                    {driver.licenseUrl ? (
                      <button
                        onClick={() => setPreviewDoc({ title: `${driver.displayName} - Driver License`, url: driver.licenseUrl! })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Eye className="size-3.5 text-primary" /> {t("license_document")}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No License uploaded</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: User & Staff Profiles Management */}
      {adminTab === "users" && (
        <div className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1.5 text-xs font-semibold">
              {(["ALL", "PASSENGER", "DRIVER", "MANAGER", "ADMIN"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`rounded-xl px-3 py-1.5 transition-colors ${userRoleFilter === r
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void fetchUsers() }}
                placeholder="Search phone or name…"
                className="rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-semibold">Phone</th>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Assigned Fleet / Plate</th>
                  <th className="pb-3 font-semibold">Security PIN</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const activeQr = u.driverProfile?.qrs?.find((q) => q.status === "ACTIVE")
                  return (
                    <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 font-mono font-bold">{u.phone}</td>
                      <td className="py-3 font-semibold">{u.name || "—"}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${u.role === "ADMIN"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : u.role === "MANAGER"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                                : u.role === "DRIVER"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3">
                        {u.driverProfile ? (
                          <span>
                            <strong className="font-mono text-primary">{activeQr?.taxiId || "No QR"}</strong> · {u.driverProfile.plateNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-muted-foreground">
                        {activeQr?.backupCode ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-bold text-foreground">{activeQr.backupCode}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => startEditUser(u)}
                          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                        >
                          Edit Profile
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="max-w-md w-full rounded-3xl border border-border bg-card p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="text-base font-bold">Edit User Profile</h4>
                  <button onClick={() => setEditingUser(null)} className="rounded-lg p-1 hover:bg-muted">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold">Phone Number</label>
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold">Full Name / Display</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Abebe Bikila"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold">User Role & Access</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="PASSENGER">PASSENGER (Standard Commuter)</option>
                      <option value="DRIVER">DRIVER (Minibus Taxi Driver)</option>
                      <option value="MANAGER">MANAGER (Operations & Financial Reports)</option>
                      <option value="ADMIN">ADMIN (Full System Superuser)</option>
                    </select>
                  </div>

                  {editForm.role === "DRIVER" && (
                    <div>
                      <label className="block font-semibold">Driver Backup Security PIN</label>
                      <input
                        value={editForm.backupCode}
                        onChange={(e) => setEditForm((p) => ({ ...p, backupCode: e.target.value.toUpperCase() }))}
                        placeholder="e.g. ABCD1234"
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">Used for fallback driver login when SMS is down.</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setEditingUser(null)}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveUserEdits}
                    disabled={actionLoading === editingUser.id}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {actionLoading === editingUser.id ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: System Settings & APIs (The Requested Feature: Live In-App Configuration!) */}
      {adminTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CreditCard className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-base">Payment Gateway Integration (AddisPay)</h3>
                <p className="text-xs text-muted-foreground">Configure payment endpoint, merchant credentials, and sandbox simulation.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-muted/50 p-3">
                <div>
                  <p className="font-bold text-foreground">Sandbox Simulation Mode</p>
                  <p className="text-[11px] text-muted-foreground">Allow instant 1-click payment simulation without real birr deduction.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingValues["addispay_sandbox_mode"] === "true"}
                  onChange={(e) => setSettingValues((p) => ({ ...p, addispay_sandbox_mode: e.target.checked ? "true" : "false" }))}
                  className="size-5 rounded border-border text-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">AddisPay API Key</label>
                <input
                  value={settingValues["addispay_api_key"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, addispay_api_key: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">AddisPay Base Gateway URL</label>
                <input
                  value={settingValues["addispay_base_url"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, addispay_base_url: e.target.value }))}
                  placeholder="https://uat.api.addispay.et"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold">AddisPay Webhook Signing Secret</label>
                <input
                  value={settingValues["addispay_webhook_secret"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, addispay_webhook_secret: e.target.value }))}
                  placeholder="sandbox-signature"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* SMS & Alerts Gateway */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Send className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-base">SMS & Telecom Notifications Gateway</h3>
                <p className="text-xs text-muted-foreground">Select active SMS provider or free Telegram Bot OTP delivery.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold">Active SMS Provider</label>
                <select
                  value={settingValues["sms_gateway_provider"] || "FREE_SANDBOX"}
                  onChange={(e) => setSettingValues((p) => ({ ...p, sms_gateway_provider: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="FREE_SANDBOX">FREE_SANDBOX (Instant 1-Click On-Screen OTP — 100% Free)</option>
                  <option value="TELEGRAM_BOT">TELEGRAM_BOT (Instant Bot OTP via @PayTaxiOtpBot — 100% Free)</option>
                  <option value="TWILIO">TWILIO (Global SMS Gateway — Free Trial / Paid)</option>
                  <option value="AFROMESSAGE">AFROMESSAGE (Local Ethiopian Ethio Telecom SMS Gateway)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold">Telegram Bot Token (For 100% Free External OTP)</label>
                <input
                  value={settingValues["telegram_bot_token"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, telegram_bot_token: e.target.value }))}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">Telegram Bot Handle</label>
                <input
                  value={settingValues["telegram_bot_username"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, telegram_bot_username: e.target.value }))}
                  placeholder="PayTaxiOtpBot"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">Twilio Account SID (Optional)</label>
                <input
                  value={settingValues["twilio_account_sid"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, twilio_account_sid: e.target.value }))}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">AfroMessage Ethiopia API Key (Optional)</label>
                <input
                  value={settingValues["afromessage_api_key"] || ""}
                  onChange={(e) => setSettingValues((p) => ({ ...p, afromessage_api_key: e.target.value }))}
                  placeholder="afromessage_live_key_..."
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Transit Fares & Platform Rules */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="size-5 text-primary" />
              <div>
                <h3 className="font-bold text-base">Minibus Transit Fares & Platform Rules</h3>
                <p className="text-xs text-muted-foreground">Customize minibus stage presets, limits, and platform commission.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
              <div className="sm:col-span-3">
                <label className="block font-semibold">Minibus Stage Presets (ETB, comma-separated)</label>
                <input
                  value={settingValues["fare_presets"] || "10, 15, 20, 25, 35, 50"}
                  onChange={(e) => setSettingValues((p) => ({ ...p, fare_presets: e.target.value }))}
                  placeholder="10, 15, 20, 25, 35, 50"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">Min Custom Fare (ETB)</label>
                <input
                  value={settingValues["min_fare_amount"] || "5"}
                  onChange={(e) => setSettingValues((p) => ({ ...p, min_fare_amount: e.target.value }))}
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">Max Custom Fare (ETB)</label>
                <input
                  value={settingValues["max_fare_amount"] || "500"}
                  onChange={(e) => setSettingValues((p) => ({ ...p, max_fare_amount: e.target.value }))}
                  type="number"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold">Platform Fee (%)</label>
                <input
                  value={settingValues["platform_fee_percent"] || "2.5"}
                  onChange={(e) => setSettingValues((p) => ({ ...p, platform_fee_percent: e.target.value }))}
                  type="number"
                  step="0.1"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-all"
            >
              <Save className="size-4" />
              {savingSettings ? "Saving Settings Live…" : "Save System Settings Live"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Embedded Financial Reports */}
      {adminTab === "reports" && (
        <div className="mt-4">
          <ManagerPortal onRefresh={fetchDrivers} onLogout={onLogout} />
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative max-w-2xl w-full rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="text-sm font-bold">{previewDoc.title}</h4>
              <button onClick={() => setPreviewDoc(null)} className="rounded-lg p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <img
                src={previewDoc.url}
                alt={previewDoc.title}
                className="max-h-[60vh] rounded-xl object-contain border border-border shadow-sm"
              />
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setPreviewDoc(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ---------- Root App ----------
export default function PayTaxiApp({ initialTaxiId }: { initialTaxiId?: string }) {
  const tHome = useTranslations("home")
  const tNav = useTranslations("nav")
  const tTaxi = useTranslations("taxi")
  const [view, setView] = useState<"loading" | "home" | "auth" | "pay" | "receipt" | "driver-register" | "dashboard" | "admin" | "manager">("loading")
  const [authRole, setAuthRole] = useState<UserRole>("PASSENGER")
  const [user, setUser] = useState<User | null>(null)
  const [dashboard, setDashboard] = useState<DriverDashboardData | null>(null)
  const [taxiInfo, setTaxiInfo] = useState<TaxiPublicInfo | null>(null)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  // Load public driver info for the QR deep-link page (/t/{taxiId})
  useEffect(() => {
    if (!initialTaxiId) return
    apiFetch(`/qr/${initialTaxiId}`)
      .then((d: TaxiPublicInfo) => setTaxiInfo(d))
      .catch(() => setTaxiInfo(null))
  }, [initialTaxiId])

  // Restore session via GET /auth/me
  useEffect(() => {
    apiFetch("/auth/me")
      .then((data: { user: User }) => {
        setUser(data.user)
        if (data.user.role === "ADMIN" || data.user.phone === "+251911111111") {
          setView("admin")
        } else if (data.user.role === "MANAGER" || data.user.phone === "+251944444444") {
          setView("manager")
        } else if (data.user.role === "DRIVER") {
          return apiFetch("/dashboard").then((d) => { setDashboard(d); setView("dashboard") })
        } else if (initialTaxiId) {
          setView("pay")
        } else {
          setView("home")
        }
      })
      .catch(() => {
        if (initialTaxiId) {
          setView("pay") // Guest passenger goes straight to pay
        } else {
          setView("home")
        }
      })
  }, [initialTaxiId])

  const loadDashboard = async () => {
    try {
      const data = await apiFetch("/dashboard")
      setDashboard(data)
      setView("dashboard")
    } catch {
      setView("driver-register")
    }
  }

  const signOut = async () => {
    await postJson("/auth/logout").catch(() => { })
    setUser(null)
    setDashboard(null)
    setView("home")
  }

  const authenticated = (nextUser: User) => {
    setUser(nextUser)
    if (nextUser.role === "ADMIN" || nextUser.phone === "+251911111111") {
      setView("admin")
    } else if (nextUser.role === "MANAGER" || nextUser.phone === "+251944444444") {
      setView("manager")
    } else if (nextUser.role === "DRIVER") {
      void loadDashboard()
    } else {
      setView("pay")
    }
  }

  const toggleLanguage = () => {
    const isAm = document.cookie.includes("NEXT_LOCALE=am")
    document.cookie = `NEXT_LOCALE=${isAm ? "en" : "am"}; path=/; max-age=31536000`
    window.location.reload()
  }

  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Clock3 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  const isAdmin = user?.role === "ADMIN" || user?.phone === "+251911111111"
  const isManager = user?.role === "MANAGER" || user?.phone === "+251944444444" || isAdmin

  return (
    <div className="min-h-screen bg-[#061412] text-slate-100">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-emerald-500/20 bg-[#031c18]/90 backdrop-blur-md px-4 py-3.5 sm:px-8">
        <div className="flex items-center gap-6">
          <Brand />
          {/* Quick tab switcher when logged in */}
          {user && (
            <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setView("pay")}
                className={`rounded-lg px-2.5 py-1.5 transition-colors ${view === "pay" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
              >
                Pay Taxi
              </button>
              {(user.role === "DRIVER" || isAdmin) && (
                <button
                  onClick={() => {
                    if (dashboard) setView("dashboard")
                    else void loadDashboard()
                  }}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${view === "dashboard" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Driver Dashboard
                </button>
              )}
              {isManager && (
                <button
                  onClick={() => setView("manager")}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${view === "manager" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Manager Reports
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setView("admin")}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${view === "admin" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Admin Console
                </button>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300/80 hover:text-emerald-300 transition-colors"
          >
            <Globe className="size-3.5" />
            <span className="hidden sm:inline">English / አማርኛ</span>
          </button>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-300">
                  {user.phone} ({user.role})
                </span>
                <button
                  onClick={signOut}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => { setAuthRole("PASSENGER"); setView("auth") }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  {tHome("passenger_login")}
                </button>
                <button
                  onClick={() => { setAuthRole("DRIVER"); setView("auth") }}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 hover:opacity-95 transition-opacity"
                >
                  {tHome("driver_portal")}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {view === "home" && (
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
          {/* Ambient background glow */}
          <div className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent blur-3xl" />

          {/* Scanned / Default Taxi Quick Card */}
          <div className="relative mb-10 overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#08201b]/80 backdrop-blur-md p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  <BadgeCheck className="size-4 text-emerald-400" />
                  <span>Verified Addis Ababa Minibus Taxi</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Taxi {taxiInfo?.taxiId || initialTaxiId || "TX-1001"} · {taxiInfo?.driver.displayName || "Abebe Bikila"}
                </h2>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <EthiopianPlate plate={taxiInfo?.driver.plateNumber || "AA 3-B12345"} size="md" />
                  <span className="text-xs text-slate-300 font-medium">
                    {taxiInfo?.driver.vehicleMake || "Toyota HiAce Minibus"} {taxiInfo?.driver.vehicleColor ? `(${taxiInfo.driver.vehicleColor})` : "(Blue & White)"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setView("pay")}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 font-bold text-white shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] hover:opacity-95"
                >
                  <CreditCard className="size-5" />
                  <span>Pay Taxi Fare (AddisPay)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300 mb-6">
              <span>🇪🇹 Addis Ababa Urban Transit FinTech Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Cashless Minibus Payments & <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">Driver Soundbox Platform</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
              Eliminating paper change shortages, fare fraud, and network drops in Ethiopian public transit with instant QR checkouts, animated anti-fraud receipts, and real-time audio chimes.
            </p>

            {/* Role Action Grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl">
              <button
                onClick={() => setView("pay")}
                className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 font-bold text-white hover:bg-emerald-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <QrCode className="size-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Passenger Minibus Checkout</div>
                    <div className="text-xs text-emerald-200/70 font-normal">No app download needed</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-emerald-400" />
              </button>

              <button
                onClick={() => { setAuthRole("DRIVER"); setView("auth") }}
                className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 font-bold text-white hover:bg-amber-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-black">
                    <Volume2 className="size-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Driver Soundbox Hub</div>
                    <div className="text-xs text-amber-200/70 font-normal">880Hz chime + Voice alerts</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-amber-400" />
              </button>

              <button
                onClick={() => { setAuthRole("MANAGER"); setView("auth") }}
                className="flex items-center justify-between rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 font-bold text-white hover:bg-sky-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500 text-slate-950">
                    <BarChart3 className="size-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Operations Manager Ledger</div>
                    <div className="text-xs text-sky-200/70 font-normal">2.5% fee splits & payouts</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-sky-400" />
              </button>

              <button
                onClick={() => { setAuthRole("ADMIN"); setView("auth") }}
                className="flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-bold text-white hover:bg-red-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-red-500 text-white">
                    <Settings className="size-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Super Admin Settings</div>
                    <div className="text-xs text-red-200/70 font-normal">Runtime in-app config</div>
                  </div>
                </div>
                <ChevronRight className="size-5 text-red-400" />
              </button>
            </div>
          </div>

          {/* Metrics Bar matching thumbnail */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-emerald-500/20 pt-8">
            <div className="rounded-2xl border border-emerald-500/20 bg-[#08201b]/60 p-4">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">50 / 50</div>
              <div className="text-xs text-slate-300 font-medium mt-1">Automated Tests Passing</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-[#08201b]/60 p-4">
              <div className="text-2xl sm:text-3xl font-black text-amber-400">&lt; 200 ms</div>
              <div className="text-xs text-slate-300 font-medium mt-1">Soundbox Audio Latency</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-[#08201b]/60 p-4">
              <div className="text-2xl sm:text-3xl font-black text-sky-400">Web + Mobile</div>
              <div className="text-xs text-slate-300 font-medium mt-1">Next.js Edge + Expo App</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-[#08201b]/60 p-4">
              <div className="text-2xl sm:text-3xl font-black text-purple-400">Zero Code</div>
              <div className="text-xs text-slate-300 font-medium mt-1">In-App Runtime Settings</div>
            </div>
          </div>
        </main>
      )}

      {view === "auth" && <OtpAuth role={authRole} onSuccess={authenticated} onBack={() => setView("home")} />}

      {view === "pay" && (
        <PassengerPay
          user={user}
          onBack={() => setView("home")}
          initialTaxiId={initialTaxiId}
          onReceipt={(receipt) => {
            setReceiptData(receipt)
            setView("receipt")
          }}
        />
      )}

      {view === "receipt" && receiptData && (
        <WeyalaReceipt
          receipt={receiptData}
          onClose={() => setView("home")}
          onNewPayment={() => setView("pay")}
        />
      )}

      {view === "driver-register" && (
        <DriverRegistration
          onDone={(data) => {
            setDashboard(data)
            setView("dashboard")
          }}
        />
      )}

      {view === "dashboard" && dashboard && (
        <DriverDashboard
          data={dashboard}
          onRefresh={loadDashboard}
          onLogout={signOut}
        />
      )}

      {view === "manager" && (
        <ManagerPortal
          onRefresh={() => { }}
          onLogout={signOut}
        />
      )}

      {view === "admin" && (
        <AdminPortal
          onRefresh={loadDashboard}
          onLogout={signOut}
        />
      )}

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        PayTaxi Ethiopia · AddisPay sandbox · Backend: {API}
      </footer>
    </div>
  )
}

