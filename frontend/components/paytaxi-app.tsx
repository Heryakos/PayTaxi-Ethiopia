"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Check, Clock3, LogOut, QrCode, ShieldCheck, Smartphone, WalletCards, Globe } from "lucide-react"
import { useTranslations } from "next-intl"
import { FARE_PRESETS } from "@paytaxi/shared"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type UserRole = "PASSENGER" | "DRIVER" | "ADMIN"
type User = { id: string; phone: string; role: UserRole }
type TaxiPublicInfo = {
  taxiId: string
  driver: { displayName: string; plateNumber: string; vehicleMake: string | null; vehicleModel: string | null; vehicleColor: string | null; rating: number }
}
type DriverDashboardData = {
  driver: { displayName: string; plateNumber: string; vehicleMake: string | null; vehicleModel: string | null; vehicleColor: string | null; verificationStatus: string }
  qr: { taxiId: string; status: string; backupCode: string | null } | null
  transactions: { id: string; amount: string; status: string; createdAt: string }[]
  total: number
  count: number
}

// ---------- API helpers (cookie-based, no localStorage) ----------
// The httpOnly cookie is sent automatically by the browser via credentials:'include'.
// We never store the JWT in JS-accessible storage.
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
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <QrCode className="size-5" />
      </div>
      <div>
        <p className="font-mono text-sm font-bold tracking-tight">{t("brand_name")}</p>
        <p className="text-[11px] text-muted-foreground">{t("brand_tagline")}</p>
      </div>
    </div>
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

// ---------- Passenger Pay ----------
function PassengerPay({ user, onBack, initialTaxiId }: { user: User | null; onBack: () => void; initialTaxiId?: string }) {
  const t = useTranslations("payment")
  const [taxiId, setTaxiId] = useState(initialTaxiId ?? "TX-1001")
  const [farePresetId, setFarePresetId] = useState("medium")
  const [state, setState] = useState<"idle" | "pending" | "error">("idle")
  const [message, setMessage] = useState("")

  const pay = async () => {
    try {
      setState("pending")
      const data = await postJson("/payments/initiate", { taxiId, farePresetId })
      setMessage(`Transaction ${data.transactionId} created for ${(data.fare as {amount:number}).amount} ETB. Provider: ${data.provider}`)
    } catch (e) { setState("error"); setMessage((e as Error).message) }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <button onClick={onBack} className="mb-8 text-sm font-semibold text-muted-foreground">← Back</button>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <ShieldCheck className="size-9 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">{t("title")}</h1>
        <p className="mt-3 leading-6 text-muted-foreground">{t("subtitle")}</p>
        <label className="mt-8 block text-sm font-semibold">{t("taxi_id_label")}
          <input value={taxiId} onChange={(e) => setTaxiId(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono" />
        </label>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FARE_PRESETS.map((fare) => (
            <button key={fare.id} onClick={() => setFarePresetId(fare.id)} className={`rounded-xl border p-4 text-left ${farePresetId === fare.id ? "border-primary bg-primary/10" : "border-border"}`}>
              <p className="font-semibold">{fare.label}</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{fare.amount} ETB</p>
            </button>
          ))}
        </div>
        <button disabled={state === "pending"} onClick={pay} className="mt-6 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {state === "pending" ? t("pending_btn") : t("continue_btn")}
        </button>
        {message && <div className={`mt-5 rounded-xl p-4 text-sm ${state === "error" ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-900"}`}>{message}</div>}
        {user && <p className="mt-4 text-xs text-muted-foreground">{t("signed_in_as")} {user.phone}</p>}
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
  const [view, setView] = useState<"loading" | "home" | "auth" | "pay" | "driver-register" | "dashboard">("loading")
  const [authRole, setAuthRole] = useState<UserRole>("PASSENGER")
  const [user, setUser] = useState<User | null>(null)
  const [dashboard, setDashboard] = useState<DriverDashboardData | null>(null)
  const [taxiInfo, setTaxiInfo] = useState<TaxiPublicInfo | null>(null)

  // Load public driver info for the QR deep-link page (/t/{taxiId})
  useEffect(() => {
    if (!initialTaxiId) return
    apiFetch(`/qr/${initialTaxiId}`)
      .then((d: TaxiPublicInfo) => setTaxiInfo(d))
      .catch(() => setTaxiInfo(null))
  }, [initialTaxiId])

  // Restore session via GET /auth/me — reads the httpOnly cookie automatically.
  // No localStorage access needed.
  useEffect(() => {
    apiFetch("/auth/me")
      .then((data: { user: User }) => {
        setUser(data.user)
        if (data.user.role === "DRIVER") {
          return apiFetch("/dashboard").then((d) => { setDashboard(d); setView("dashboard") })
        } else if (initialTaxiId) {
          setView("pay") // passenger scanned/opened a taxi — go straight to pay
        } else {
          setView("home") // passenger — go to home, let them initiate a payment
        }
      })
      .catch(() => setView("home")) // no session, show home
  }, [initialTaxiId])

  const loadDashboard = async () => {
    try { const data = await apiFetch("/dashboard"); setDashboard(data); setView("dashboard") }
    catch { setView("driver-register") }
  }

  const signOut = async () => {
    await postJson("/auth/logout").catch(() => {}) // clear server-side cookie
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
                <button onClick={() => { setAuthRole("PASSENGER"); setView(user ? "pay" : "auth") }} className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
                  {user ? tTaxi("pay") : tTaxi("pay_signin")}
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
              <button onClick={() => { setAuthRole("PASSENGER"); setView("auth") }} className="rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground">{tHome("pay_btn")}</button>
              <button onClick={() => { setAuthRole("DRIVER"); setView("auth") }} className="rounded-xl border border-border px-5 py-3.5 font-semibold">{tHome("driver_btn")}</button>
            </div>
          </div>
        </main>
      )}
      {view === "auth" && <OtpAuth role={authRole} onSuccess={authenticated} onBack={() => setView("home")} />}
      {view === "pay" && <PassengerPay user={user} onBack={() => setView("home")} initialTaxiId={initialTaxiId} />}
      {view === "driver-register" && <DriverRegistration onDone={(data) => { setDashboard(data); setView("dashboard") }} />}
      {view === "dashboard" && dashboard && <DriverDashboard data={dashboard} onRefresh={loadDashboard} onLogout={signOut} />}
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        PayTaxi Ethiopia · AddisPay sandbox · Backend: {API}
      </footer>
    </div>
  )
}
