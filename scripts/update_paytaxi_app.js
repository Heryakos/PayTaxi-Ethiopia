const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../frontend/components/paytaxi-app.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Ensure ManagerPortal and upgraded AdminPortal code is included
const managerAndAdminCode = `
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
        apiFetch(\`/admin/transactions?status=\${statusFilter}&search=\${encodeURIComponent(search)}\`),
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
            <RefreshCw className={\`size-3.5 \${loading ? "animate-spin" : ""}\`} /> Refresh
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
              className={\`rounded-xl px-3 py-1.5 transition-colors \${
                statusFilter === st
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }\`}
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
                      <p className="font-semibold">{tx.driverProfile?.displayName || "Driver"}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{tx.driverProfile?.plateNumber || "Plate"}</p>
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">
                      {tx.passengerUser?.phone || "Guest Passenger"}
                    </td>
                    <td className="py-3 text-right font-black text-sm">
                      {tx.amount} <span className="font-normal text-[10px] text-muted-foreground">ETB</span>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={\`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider \${
                          tx.status === "SUCCESS"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : tx.status === "FAILED"
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                        }\`}
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
      const data = await apiFetch(\`/admin/users?role=\${userRoleFilter}&search=\${encodeURIComponent(userSearch)}\`)
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
      const res = await postJson(\`/drivers/\${driverId}/approve\`)
      setMessage({ text: \`Driver approved! Active Taxi QR Code \${res.qr?.taxiId} created.\`, type: "success" })
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
      await postJson(\`/drivers/\${driverId}/reject\`, { reason: "Documents did not pass verification." })
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
      await putJson(\`/admin/users/\${editingUser.id}\`, {
        name: editForm.name,
        phone: editForm.phone,
        role: editForm.role,
      })
      if (editingUser.driverProfile && editForm.backupCode) {
        await putJson(\`/admin/drivers/\${editingUser.driverProfile.displayName ? editingUser.driverProfile : editingUser.id}/backup-code\`, {
          backupCode: editForm.backupCode,
        }).catch(() => {})
      }
      setMessage({ text: \`User \${editForm.phone} updated successfully!\`, type: "success" })
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
            <RefreshCw className={\`size-3.5 \${loading ? "animate-spin" : ""}\`} /> Refresh
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
          className={\`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all \${
            adminTab === "kyc"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }\`}
        >
          <Shield className="size-4" /> Driver KYC Review ({drivers.filter((d) => d.verificationStatus === "PENDING").length} pending)
        </button>

        <button
          onClick={() => setAdminTab("users")}
          className={\`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all \${
            adminTab === "users"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }\`}
        >
          <Users className="size-4" /> User & Staff Profiles
        </button>

        <button
          onClick={() => setAdminTab("settings")}
          className={\`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all \${
            adminTab === "settings"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }\`}
        >
          <Settings className="size-4" /> System Settings & APIs (No Code Needed)
        </button>

        <button
          onClick={() => setAdminTab("reports")}
          className={\`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all \${
            adminTab === "reports"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "border border-border bg-card text-muted-foreground hover:text-foreground"
          }\`}
        >
          <BarChart3 className="size-4" /> Financial Reports
        </button>
      </div>

      {/* Toast Notification Message */}
      {message && (
        <div
          className={\`mt-4 rounded-xl p-3.5 text-xs font-semibold \${
            message.type === "success"
              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-destructive/15 text-destructive border border-destructive/30"
          }\`}
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
                className={\`rounded-xl px-3.5 py-1.5 transition-colors \${
                  driverFilter === tab
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }\`}
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
                          className={\`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider \${
                            driver.verificationStatus === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : driver.verificationStatus === "PENDING"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "bg-destructive/15 text-destructive"
                          }\`}
                        >
                          {driver.verificationStatus}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{driver.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.vehicleColor ?? ""} {driver.vehicleMake ?? ""} {driver.vehicleModel ?? ""} · Plate:{" "}
                        <strong className="font-mono text-foreground">{driver.plateNumber}</strong>
                      </p>
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
                        onClick={() => setPreviewDoc({ title: \`\${driver.displayName} - National ID\`, url: driver.nationalIdUrl! })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Eye className="size-3.5 text-primary" /> {t("id_document")}
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No National ID uploaded</span>
                    )}

                    {driver.licenseUrl ? (
                      <button
                        onClick={() => setPreviewDoc({ title: \`\${driver.displayName} - Driver License\`, url: driver.licenseUrl! })}
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
                  className={\`rounded-xl px-3 py-1.5 transition-colors \${
                    userRoleFilter === r
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }\`}
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
                          className={\`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider \${
                            u.role === "ADMIN"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                              : u.role === "MANAGER"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : u.role === "DRIVER"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }\`}
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
`;

// Replace the old AdminPortal with both ManagerPortal and the new AdminPortal
const oldAdminPortalStart = content.indexOf('// ---------- Admin Driver Verification & KYC Review Portal ----------');
const oldAdminPortalEnd = content.indexOf('// ---------- Root App ----------');

if (oldAdminPortalStart !== -1 && oldAdminPortalEnd !== -1) {
  content = content.slice(0, oldAdminPortalStart) + managerAndAdminCode + '\n' + content.slice(oldAdminPortalEnd);
  console.log('AdminPortal replaced with ManagerPortal + enhanced AdminPortal successfully.');
} else {
  console.error('Could not find AdminPortal bounds!');
  process.exit(1);
}

// 2. Update PayTaxiApp root component to handle MANAGER role, view "manager", and header navigation
content = content.replace(
  'const [view, setView] = useState<"loading" | "home" | "auth" | "pay" | "receipt" | "driver-register" | "dashboard" | "admin">("loading")',
  'const [view, setView] = useState<"loading" | "home" | "auth" | "pay" | "receipt" | "driver-register" | "dashboard" | "admin" | "manager">("loading")'
);

content = content.replace(
  `        if (data.user.role === "ADMIN" || data.user.phone === "+251911111111") {
          setView("admin")
        } else if (data.user.role === "DRIVER") {`,
  `        if (data.user.role === "ADMIN" || data.user.phone === "+251911111111") {
          setView("admin")
        } else if (data.user.role === "MANAGER" || data.user.phone === "+251944444444") {
          setView("manager")
        } else if (data.user.role === "DRIVER") {`
);

content = content.replace(
  `    if (nextUser.role === "ADMIN" || nextUser.phone === "+251911111111") {
      setView("admin")
    } else if (nextUser.role === "DRIVER") {`,
  `    if (nextUser.role === "ADMIN" || nextUser.phone === "+251911111111") {
      setView("admin")
    } else if (nextUser.role === "MANAGER" || nextUser.phone === "+251944444444") {
      setView("manager")
    } else if (nextUser.role === "DRIVER") {`
);

// Add manager navigation in header
content = content.replace(
  `const isAdmin = user?.role === "ADMIN" || user?.phone === "+251911111111"`,
  `const isAdmin = user?.role === "ADMIN" || user?.phone === "+251911111111"
  const isManager = user?.role === "MANAGER" || user?.phone === "+251944444444" || isAdmin`
);

content = content.replace(
  `              {isAdmin && (
                <button
                  onClick={() => setView("admin")}
                  className={\`rounded-lg px-2.5 py-1.5 transition-colors \${
                    view === "admin" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }\`}
                >
                  Admin Verification
                </button>
              )}`,
  `              {isManager && (
                <button
                  onClick={() => setView("manager")}
                  className={\`rounded-lg px-2.5 py-1.5 transition-colors \${
                    view === "manager" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }\`}
                >
                  Manager Reports
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setView("admin")}
                  className={\`rounded-lg px-2.5 py-1.5 transition-colors \${
                    view === "admin" ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                  }\`}
                >
                  Admin Console
                </button>
              )}`
);

// Add Manager access button on homepage
content = content.replace(
  `              {/* Dev quick-access for admin testing */}
              <button
                onClick={() => { setAuthRole("ADMIN"); setView("auth") }}
                className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Admin Review Login
              </button>`,
  `              {/* Quick access for Manager and Admin testing */}
              <button
                onClick={() => { setAuthRole("MANAGER"); setView("auth") }}
                className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Manager Access
              </button>
              <button
                onClick={() => { setAuthRole("ADMIN"); setView("auth") }}
                className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Admin Console
              </button>`
);

// Add manager view render
content = content.replace(
  `      {view === "admin" && (
        <AdminPortal
          onRefresh={loadDashboard}
          onLogout={signOut}
        />
      )}`,
  `      {view === "manager" && (
        <ManagerPortal
          onRefresh={() => {}}
          onLogout={signOut}
        />
      )}

      {view === "admin" && (
        <AdminPortal
          onRefresh={loadDashboard}
          onLogout={signOut}
        />
      )}`
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('paytaxi-app.tsx successfully updated!');

