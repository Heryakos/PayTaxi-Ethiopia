"use client"

import { useEffect, useState } from "react"
import {
  BadgeCheck, Check, Clock3, LogOut, QrCode, ShieldCheck, Smartphone,
  WalletCards, Globe, CheckCircle2, Car, ArrowLeft, Users, Sparkles
} from "lucide-react"
import { useTranslations } from "next-intl"
import { FARE_PRESETS } from "@paytaxi/shared"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type UserRole = "PASSENGER" | "DRIVER" | "ADMIN"
type User = { id: string; phone: string; role: UserRole }

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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data
}

function postJson(path: string, payload?: unknown) {
  return apiFetch(path, { method: "POST", body: payload ? JSON.stringify(payload) : undefined })
}

// ---------- Brand ----------
function Brand() {
  const t = useTranslations("nav")
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <QrCode className="size-5" />
      </div>
      <div>
        <p className="font-mono text-sm font-bold tracking-tight">{t("brand_name")}</p>
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
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-card p-6 shadow-2xl sm:p-8">
        {/* Animated dynamic security watermark pattern */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-60 rounded-full bg-primary/10 blur-3xl" />

        {/* Big pulsing verification badge for the Weyala */}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="size-11" />
            <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/60 animate-ping" />
          </div>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {t("verified_banner")}
          </div>

          <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {t("weyala_instruction")}
          </p>

          {/* Live pulsing timer */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3.5 py-1.5 font-mono text-xs font-semibold text-foreground">
            <Clock3 className="size-3.5 text-emerald-600 animate-spin" />
            <span>{t("live_timer", { seconds: secondsAgo })}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{currentTime}</span>
          </div>
        </div>

        {/* Ethiopian Minibus Amount Display */}
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("amount_paid")}</p>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black tracking-tight text-foreground">{receipt.amount}</span>
            <span className="font-mono text-xl font-bold text-emerald-600">ETB</span>
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {receipt.label} · {receipt.seats} {t("seats_paid")}
          </p>
        </div>

        {/* Taxi & Driver Identification Card */}
        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-background/50 p-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-medium text-muted-foreground">{t("plate_label")}</span>
            <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-foreground/20 bg-muted px-2.5 py-1 font-mono text-sm font-black tracking-wider text-foreground">
              <Car className="size-4 text-primary" />
              <span>{receipt.driver.plateNumber || receipt.taxiId}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
            <span className="text-xs font-medium text-muted-foreground">{t("taxi_id_label")}</span>
            <span className="font-mono font-bold text-primary">{receipt.taxiId}</span>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
            <span className="text-xs font-medium text-muted-foreground">{t("driver_label")}</span>
            <span className="font-semibold text-foreground">{receipt.driver.displayName}</span>
          </div>

          {receipt.driver.vehicleMake && (
            <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
              <span className="text-xs font-medium text-muted-foreground">Vehicle</span>
              <span className="text-xs text-muted-foreground">
                {receipt.driver.vehicleMake} {receipt.driver.vehicleModel || ""} {receipt.driver.vehicleColor ? `(${receipt.driver.vehicleColor})` : ""}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>{t("security_hash")}</span>
            <span className="font-mono font-semibold tracking-wider text-foreground">{shortCode}</span>
          </div>
        </div>

        {/* Anti-fraud note */}
        <p className="mt-4 text-center text-[11px] leading-4 text-muted-foreground">
          {t("anti_fraud_notice")}
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-95"
          >
            {t("done_btn")}
          </button>
          <button
            onClick={onNewPayment}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
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
            <div className="mt-3 flex items-center justify-between rounded-xl bg-primary/5 px-3.5 py-2 text-xs">
              <div>
                <span className="font-semibold text-foreground">{taxiDetails.driver.displayName}</span>
                <span className="text-muted-foreground"> · {taxiDetails.driver.vehicleMake} {taxiDetails.driver.vehicleColor}</span>
              </div>
              <span className="rounded-md border border-primary/20 bg-card px-2 py-0.5 font-mono font-bold text-primary">
                {taxiDetails.driver.plateNumber}
              </span>
            </div>
          )}
        </div>

        {/* Fare Mode Selector Tabs */}
        <div className="mt-6 flex rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setFareMode("preset")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              fareMode === "preset" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("presets_tab")}
          </button>
          <button
            type="button"
            onClick={() => setFareMode("custom")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              fareMode === "custom" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    active
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
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  passengerCount === num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
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

// ---------- OTP Auth ----------
function OtpAuth({ role, onSuccess, onBack }: { role: UserRole; onSuccess: (user: User) => void; onBack: () => void }) {
  const t = useTranslations("auth")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const request = async () => {
    try { setError(""); setLoading(true); const data = await postJson("/auth/request-otp", { phone, role }); setChallengeId(data.challengeId); setDevCode(data.code) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }
  const verify = async () => {
    try {
      setError(""); setLoading(true)
      const data = await postJson("/auth/verify-otp", { challengeId, code })
      onSuccess(data.user)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-16 sm:px-8">
      <button onClick={onBack} className="mb-8 text-left text-sm font-semibold text-muted-foreground">← Back</button>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <Smartphone className="size-9 text-primary" />
        <h1 className="mt-5 text-3xl font-bold tracking-tight">{role === "DRIVER" ? t("title_driver") : t("title_passenger")}</h1>
        <p className="mt-3 leading-6 text-muted-foreground">{t("subtitle")}</p>
        {!challengeId ? (
          <>
            <label className="mt-8 block text-sm font-semibold" htmlFor="phone">{t("phone_label")}</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phone_placeholder")} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3" />
            <button onClick={request} disabled={loading} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">
              {loading ? t("sending") : t("send_otp")}
            </button>
          </>
        ) : (
          <>
            {devCode && <div className="mt-6 rounded-xl bg-primary/10 p-4 text-sm">{t("dev_otp")} <strong className="font-mono">{devCode}</strong></div>}
            <label className="mt-6 block text-sm font-semibold" htmlFor="otp">{t("otp_label")}</label>
            <input id="otp" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono tracking-[0.3em]" />
            <button onClick={verify} disabled={loading} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">
              {loading ? t("verifying") : t("verify")}
            </button>
          </>
        )}
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  )
}

// ---------- Driver Registration ----------
function DriverRegistration({ onDone }: { onDone: (data: DriverDashboardData) => void }) {
  const t = useTranslations("registration")
  const [form, setForm] = useState({ name: "", vehicleMake: "Toyota", vehicleModel: "Corolla", vehicleColor: "White", plateNumber: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    try {
      setError(""); setLoading(true)
      const result = await postJson("/drivers/register", form)
      onDone({ driver: result.driver, qr: null, transactions: [], total: 0, count: 0 })
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("label")}</p>
        <h1 className="mt-3 text-3xl font-bold">{t("title")}</h1>
        <p className="mt-3 leading-6 text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Object.entries(form).map(([key, value]) => (
            <label key={key} className="text-sm font-semibold">
              {key === "plateNumber" ? "Plate number" : key.replace(/([A-Z])/g, " $1")}
              <input value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3" />
            </label>
          ))}
          <label className="text-sm font-semibold">{t("mock_id")}<input type="file" disabled className="mt-2 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm" /></label>
          <label className="text-sm font-semibold">{t("mock_license")}<input type="file" disabled className="mt-2 w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm" /></label>
        </div>
        <button onClick={submit} disabled={loading} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {loading ? t("submitting") : t("submit")}
        </button>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  )
}

// ---------- Driver Dashboard ----------
function DriverDashboard({ data, onRefresh, onLogout }: { data: DriverDashboardData; onRefresh: () => void; onLogout: () => void }) {
  const t = useTranslations("dashboard")
  const [replacing, setReplacing] = useState(false)

  const replaceQr = async () => {
    try { setReplacing(true); await postJson("/qr/replace"); onRefresh() }
    catch { /* ignore */ }
    finally { setReplacing(false) }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("label")}</p>
          <h1 className="mt-2 text-3xl font-bold">{t("welcome", { name: data.driver.displayName })}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button onClick={onLogout} className="inline-flex items-center gap-2 self-start rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          <LogOut className="size-4" />{t("log_out")}
        </button>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <WalletCards className="size-5 text-primary" />
          <p className="mt-5 text-2xl font-bold">{data.total.toLocaleString()} ETB</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("earnings")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Check className="size-5 text-primary" />
          <p className="mt-5 text-2xl font-bold">{data.count}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("payments")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <QrCode className="size-5 text-primary" />
          <p className="mt-5 font-mono text-xl font-bold">{data.qr?.taxiId ?? t("no_qr")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.qr?.status ?? data.driver.verificationStatus}</p>
          {data.qr?.taxiId && (
            <a
              href={`${API}/qr/${data.qr.taxiId}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              {t("download_qr")}
            </a>
          )}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={replaceQr} disabled={replacing} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold disabled:opacity-60">
          {replacing ? t("replacing") : t("report_lost")}
        </button>
        <button onClick={onRefresh} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">{t("refresh")}</button>
      </div>
      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">{t("recent_tx")}</h2>
        <div className="mt-4 flex flex-col gap-3">
          {data.transactions.length ? data.transactions.map((row) => (
            <div key={row.id} className="flex items-center justify-between border-b border-border pb-3 text-sm">
              <span className="font-mono text-xs">{row.id.slice(0, 12)}…</span>
              <span>{row.amount} ETB</span>
              <span className="font-semibold">{row.status}</span>
            </div>
          )) : <p className="text-sm text-muted-foreground">{t("no_tx")}</p>}
        </div>
      </section>
    </main>
  )
}

// ---------- Root App ----------
export default function PayTaxiApp({ initialTaxiId }: { initialTaxiId?: string }) {
  const tHome = useTranslations("home")
  const tNav = useTranslations("nav")
  const tTaxi = useTranslations("taxi")
  const [view, setView] = useState<"loading" | "home" | "auth" | "pay" | "receipt" | "driver-register" | "dashboard">("loading")
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

  // Restore session via GET /auth/me — reads the httpOnly cookie automatically.
  // For guest passengers: if initialTaxiId is provided, jump directly to "pay"!
  useEffect(() => {
    apiFetch("/auth/me")
      .then((data: { user: User }) => {
        setUser(data.user)
        if (data.user.role === "DRIVER") {
          return apiFetch("/dashboard").then((d) => { setDashboard(d); setView("dashboard") })
        } else if (initialTaxiId) {
          setView("pay")
        } else {
          setView("home")
        }
      })
      .catch(() => {
        if (initialTaxiId) {
          setView("pay") // Guest passenger scanning a taxi QR goes straight to pay
        } else {
          setView("home")
        }
      })
  }, [initialTaxiId])

  const loadDashboard = async () => {
    try { const data = await apiFetch("/dashboard"); setDashboard(data); setView("dashboard") }
    catch { setView("driver-register") }
  }

  const signOut = async () => {
    await postJson("/auth/logout").catch(() => {})
    setUser(null); setDashboard(null); setView("home")
  }

  const authenticated = (nextUser: User) => {
    setUser(nextUser)
    if (nextUser.role === "DRIVER") void loadDashboard()
    else setView("pay")
  }

  const toggleLanguage = () => {
    const isAm = document.cookie.includes("NEXT_LOCALE=am");
    document.cookie = `NEXT_LOCALE=${isAm ? "en" : "am"}; path=/; max-age=31536000`;
    window.location.reload();
  };

  if (view === "loading") {
    return <div className="flex min-h-screen items-center justify-center"><Clock3 className="size-6 animate-spin text-primary" /></div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-8">
        <Brand />
        <div className="flex items-center gap-4">
          <button onClick={toggleLanguage} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Globe className="size-4" />
            <span className="hidden sm:inline">English / አማርኛ</span>
          </button>
          <div className="flex gap-2">
            {user ? (
              <button onClick={signOut} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">Sign out</button>
            ) : (
              <>
                <button onClick={() => { setAuthRole("PASSENGER"); setView("auth") }} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">{tHome("passenger_login")}</button>
                <button onClick={() => { setAuthRole("DRIVER"); setView("auth") }} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">{tHome("driver_portal")}</button>
              </>
            )}
          </div>
        </div>
      </header>

      {view === "home" && (
        <main className="mx-auto max-w-5xl px-4 py-20 sm:px-8">
          {taxiInfo && (
            <div className="mb-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    <BadgeCheck className="size-3.5" />{tTaxi("verified")}
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">{taxiInfo.taxiId} · {taxiInfo.driver.displayName}</h2>
                  <p className="mt-2 text-muted-foreground">
                    {taxiInfo.driver.plateNumber} · {taxiInfo.driver.vehicleMake ?? ""} {taxiInfo.driver.vehicleModel ?? ""} {taxiInfo.driver.vehicleColor ?? ""}
                  </p>
                </div>
                {/* Guest-enabled button: goes straight to pay, no login required */}
                <button
                  onClick={() => setView("pay")}
                  className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
                >
                  {tTaxi("pay")}
                </button>
              </div>
            </div>
          )}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
              <BadgeCheck className="size-3.5" />{tHome("tagline")}
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-balance sm:text-6xl">{tHome("heading")}</h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{tHome("description")}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              {/* Direct passenger pay button (guest enabled) */}
              <button onClick={() => setView("pay")} className="rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95">
                {tHome("pay_btn")}
              </button>
              <button onClick={() => { setAuthRole("DRIVER"); setView("auth") }} className="rounded-xl border border-border px-5 py-3.5 font-semibold transition-colors hover:bg-muted">
                {tHome("driver_btn")}
              </button>
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

      {view === "driver-register" && <DriverRegistration onDone={(data) => { setDashboard(data); setView("dashboard") }} />}
      {view === "dashboard" && dashboard && <DriverDashboard data={dashboard} onRefresh={loadDashboard} onLogout={signOut} />}

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        PayTaxi Ethiopia · AddisPay sandbox · Backend: {API}
      </footer>
    </div>
  )
}

