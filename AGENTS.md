# PayTaxi AI Coding Reference
# Update this file after EVERY change — not just initial setup.

## Top-Level Folder Purposes
- `/frontend` — Next.js 16 App Router UI. Calls `/backend` over HTTP. No DB access, no Prisma. Auth via httpOnly cookie.
- `/backend` — Express + Prisma API server. All business logic, auth, payments, webhooks live here.
- `/mobile` — React Native (Expo) app. Calls `/backend` over HTTP using `lib/api.ts`. Auth via expo-secure-store + Bearer header.
- `/packages/shared` — Shared TypeScript types (`types.ts`) and browser API client (`api-client.ts`). Cookie-based, no localStorage. **Consumed by the frontend** via `frontend/tsconfig.json` path alias `@paytaxi/shared → ../packages/shared/src` + `transpilePackages` in `frontend/next.config.mjs` (package.json `main` points at unbuilt `dist`, so always import from src through the alias). Backend does NOT import shared — it is the source of truth for `FARE_PRESETS`/`canTransition`.
- `/docs` — `PROJECT_STATUS.md`, `ARCHITECTURE.md`, `PAYTAXI_MANUAL.md`, `PAYTAXI_DEPLOYMENT_AND_OPERATIONS_MANUAL.pdf`, `PAYTAXI_PORTFOLIO_CASE_STUDY.pdf`, and `/docs/portfolio/` suite.

## Portfolio Suite & Presentation Assets
- **Location**: `docs/portfolio/`
- **Visual Identity Parity**: Web frontend (`frontend/`) and portfolio assets now strictly share the exact same dark emerald (`#061412` / `#00473e`) FinTech theme, authentic Ethiopian license plates (`AA 3-B12345`), gold accents (`#f59e0b`), and bilingual `Plus Jakarta Sans` + `Noto Sans Ethiopic` typography.
- **Cross-Platform Dual Showcase (Desktop Laptop + Phone Side-by-Side 1920x1080 @2x)**: `docs/portfolio/showcase_desktop_and_mobile.png`
- **Portfolio Thumbnail / Hero Banner (1920x1080 @2x)**: `docs/portfolio/portfolio_thumbnail.png`
- **Combined All-in-One Product Showcase**: `docs/portfolio/portfolio_combined_showcase.png`
- **Mobile Smartphone Mockups (@2x Retina)**:
  - `mobile_01_passenger_checkout.png` — Mobile minibus checkout on smartphone device frame.
  - `mobile_02_anti_fraud_receipt.png` — Smartphone Weyala receipt with live ticking timer and Ethiopian plate.
  - `mobile_03_driver_soundbox.png` — Smartphone Driver Soundbox app with audio visualizer and today's revenue.
  - `mobile_04_qr_scanner.png` — Smartphone camera viewfinder scanning taxi QR with crosshair laser.
- **Web Desktop UI Screenshots (@2x Crisp Retina)**:
  - `01_passenger_checkout.png` — Passenger minibus fare stage selector (10–50 ETB), multi-seat count, vehicle verification.
  - `02_anti_fraud_receipt.png` — Weyala anti-fraud animated green receipt with live ticking timer, plate badge (`AA 3-B12345`), and security code.
  - `03_driver_soundbox_dashboard.png` — Driver Soundbox hub with active audio chime indicator (587 & 880 Hz), TX-1001 QR, and earnings.
  - `04_manager_financial_ledger.png` — Operations Manager financial hub with KPI cards (Gross volume, 2.5% platform commission, net payouts) and audit journal.
  - `05_admin_system_settings.png` — Super Admin console with runtime In-App Live Settings (AddisPay credentials, SMS gateway selector, transit rules).
  - `06_multimethod_auth.png` — 3-in-1 multi-method sign-in: 1-click test OTP, Driver Backup PIN (`ABCD1234`), and WhatsApp QR.
- **Copy-Paste Portfolio Case Study**: `docs/portfolio/PORTFOLIO_CASE_STUDY.md` (Ready for portfolio websites, Upwork, Behance, Notion, Framer, Webflow, GitHub).
- **Executive PDF Case Study**: `docs/PAYTAXI_PORTFOLIO_CASE_STUDY.pdf`
- **Asset Generator Script**: `scripts/generate_portfolio_assets.js` (Run: `node scripts/generate_portfolio_assets.js`)

## Live Cloud Deployments (Production)
- **Database (Supabase PostgreSQL)**: `paytaxi-db` (Project Ref: `sklddyglnuigdnqhegck`, Region: `eu-west-1`). Pooler host: `aws-0-eu-west-1.pooler.supabase.com:5432`.
- **Backend API (Render Web Service)**: `https://paytaxi-api.onrender.com` (Health check: `/health`, Public taxi verify: `/qr/TX-1001`).
- **Frontend Web App (Vercel)**: `https://pay-taxi-ethiopia.vercel.app` (Next.js 16 App Router, Taxi deep link: `/t/TX-1001`).
- **Operations & Deployment Manual**: `docs/PAYTAXI_DEPLOYMENT_AND_OPERATIONS_MANUAL.pdf` (Publication-grade PDF with embedded screenshots).

## Feature Implementation Map

### Auth
- Request OTP: `backend/src/routes/auth.ts` → `POST /auth/request-otp` (rate limited: 30/15min)
- Verify OTP + JWT issuance + **httpOnly cookie set**: `backend/src/routes/auth.ts` → `POST /auth/verify-otp`
- **Driver Backup PIN Login Fallback**: `backend/src/routes/auth.ts` → `POST /auth/login-pin` (validates driver phone + backupCode, bypasses SMS during network downtime)
- **WhatsApp-Style QR Login**: `backend/src/routes/auth.ts` → `POST /auth/qr-session`, `GET /auth/qr-session/:token`, `POST /auth/qr-session/:token/approve`
- Session restore (web): `backend/src/routes/auth.ts` → `GET /auth/me` — reads cookie, returns user
- Logout: `backend/src/routes/auth.ts` → `POST /auth/logout` — clears cookie
- OTP logic (hash, challenge, attempt limit): `backend/src/services/auth.service.ts`
- Auth middleware (JWT verify from **cookie OR Bearer header**, requireRole): `backend/src/middlewares/auth.middleware.ts` (Supports PASSENGER, DRIVER, MANAGER, ADMIN)

### Operations Manager & Financial Ledger
- UI: `ManagerPortal` in `frontend/components/paytaxi-app.tsx`
- Reports API: `backend/src/routes/admin.ts` → `GET /admin/reports` (Gross revenue, platform commission 2.5%, driver net payouts, completed trips, average fare)
- Transactions Ledger: `backend/src/routes/admin.ts` → `GET /admin/transactions` (Filter by status, search by Taxi ID, plate, or reference)
- Seeded Manager account: `+251944444444`

### Admin Portal & In-App Configuration (No Code Changes Needed!)
- UI: `AdminPortal` in `frontend/components/paytaxi-app.tsx`
- **Tab 1 (KYC Review)**: Review national IDs/licenses, approve/reject drivers, issue active taxi QRs
- **Tab 2 (User & Staff Management)**: `GET /admin/users`, `PUT /admin/users/:id` (edit name, phone, change roles across PASSENGER/DRIVER/MANAGER/ADMIN, reset Driver Backup PIN)
- **Tab 3 (Live System Settings)**: `GET /admin/settings`, `PUT /admin/settings` (configure AddisPay API keys/URL/sandbox toggle, SMS gateway selection [Sandbox, Telegram Bot, Twilio, AfroMessage], fare presets, platform commission)
- **Tab 4 (Financial Reports)**: Embedded Manager financial hub
- Settings service: `backend/src/services/settings.service.ts` backed by `system_setting` table in Supabase PostgreSQL

### Driver Registration & Verification
- Register driver (PENDING): `backend/src/routes/drivers.ts` → `POST /drivers/register`
- Driver KYC upload: `backend/src/routes/drivers.ts` → `POST /drivers/upload` (National ID / License)
- Admin approve (APPROVED + QR issuance): `backend/src/routes/drivers.ts` → `POST /drivers/:id/approve`
- Admin reject: `backend/src/routes/drivers.ts` → `POST /drivers/:id/reject`
- Admin list all: `backend/src/routes/drivers.ts` → `GET /drivers/admin/all`
- Driver profile fetch: `backend/src/routes/drivers.ts` → `GET /drivers/profile`
- Service logic: `backend/src/services/drivers.service.ts`

### Driver Dashboard & Real-Time Soundbox
- Aggregated earnings + recent transactions: `backend/src/routes/dashboard.ts` → `GET /dashboard`
- **Real-Time Soundbox SSE Stream**: `backend/src/routes/dashboard.ts` → `GET /dashboard/stream` (EventSource)
- Soundbox audio engine: `frontend/components/paytaxi-app.tsx` — Web Audio API dual-tone chime (587 & 880 Hz) + Web Speech voice synthesis on `PAYMENT_SUCCESS` events
- Event hub: `backend/src/services/events.service.ts` → `broadcastPaymentSuccess()`

### QR Lifecycle
- Replace lost/stolen QR: `backend/src/routes/qr.ts` → `POST /qr/replace`
- **QR PNG generation**: `backend/src/routes/qr.ts` → `GET /qr/:taxiId.png` — real PNG via `qrcode` npm, encodes `https://paytaxi.et/t/{taxiId}`
- **Public taxi verify (deep-link page)**: `backend/src/routes/qr.ts` → `GET /qr/:taxiId` — returns approved driver info, powers web `/t/{taxiId}`. Must stay registered AFTER `/:taxiId.png`
- QR logic (disable current ACTIVE, create new ACTIVE): `backend/src/services/drivers.service.ts#replaceLostQr`

### Payments
- Initiate payment (server validates fare/taxi/driver): `backend/src/routes/payments.ts` → `POST /payments/initiate` (rate limited: 30/15min)
- **Guest passenger checkout**: `optionalAuth` middleware allows passengers to pay without forced login (`passengerUserId` is optional in DB)
- **Minibus transit fare presets**: `backend/src/services/fares.ts` (10, 15, 20, 25, 35, 50 ETB) + multi-seat count multiplier + custom fares (5–500 ETB)
- **Public transaction status / receipt**: `backend/src/routes/payments.ts` → `GET /payments/:id`
- **Sandbox test simulation**: `backend/src/routes/payments.ts` → `POST /payments/:id/simulate-success`
- **Weyala anti-fraud receipt**: Dynamic animated green receipt on web and mobile with live ticking timer, Ethiopian plate number badge, and anti-screenshot security code
- Payment provider interface + sandbox: `backend/src/services/provider.ts` (AddisPaySandboxProvider)

### Webhooks
- AddisPay callback: `backend/src/routes/webhooks.ts` → `POST /webhooks/addispay`
- Idempotency: unique constraint on `(provider, providerEventId)` in DB
- Compare-and-set: `updateMany` with status precondition; if `count === 0`, re-reads actual status — idempotent if matches, logs `webhook_race_conflict` warning if not
- State machine (legal transitions): `backend/src/services/fares.ts#canTransition`
- **canTransition() is called on every webhook status write. Payment initiation bypasses it (PENDING is always a valid start state).**

### Admin Portal & Operations
- UI: `AdminPortal` in `frontend/components/paytaxi-app.tsx`
- Operations & Deployment Manual: `docs/PAYTAXI_MANUAL.md`

### i18n
- Frontend: `next-intl` — plugin in `frontend/next.config.mjs`, locale via `NEXT_LOCALE` cookie, messages in `frontend/messages/{en,am}.json`, config at `frontend/i18n/request.ts`, wired into `paytaxi-app.tsx` with a language toggle button
- Mobile: `react-i18next` — configured in `mobile/lib/i18n.ts` with inline en/am translations; call `i18n.changeLanguage('am')` to switch

## Database (Prisma)
- Schema: `backend/prisma/schema.prisma` (SQL Server) and `backend/prisma/schema.supabase.prisma` (Supabase PostgreSQL)
- Provider config: `backend/prisma.config.ts` (Prisma 7 — url moved out of schema.prisma)
- **Current local provider: `sqlserver`** (local DESKTOP-SI08CAC / `paytaxi` database)
- **Supabase/PostgreSQL Turnkey**: Run `pnpm db:push:supabase` and `pnpm prisma:generate:supabase` with `DATABASE_URL` pointing to Supabase.
- Seed: `backend/prisma/seed.ts` (run: `cd backend && pnpm prisma:seed`)

### Table Summary
| Table | Purpose |
|---|---|
| `app_user` | Passengers, drivers, managers, admins. `role` field: PASSENGER/DRIVER/MANAGER/ADMIN |
| `driver_profile` | Driver details. `verificationStatus`: PENDING/APPROVED/REJECTED — enforced by DB CHECK constraint |
| `taxi_qr` | QR codes. `taxiId` is unique human-readable (e.g. TX-1001). `status`: ACTIVE/DISABLED/REPLACED — enforced by DB CHECK constraint |
| `transaction` | Payment records. `status`: PENDING/SUCCESS/FAILED/REFUNDED/UNKNOWN — enforced by DB CHECK constraint. Financial records are never deleted (NoAction FK) |
| `webhook_event` | Idempotent log of provider callbacks. Unique on `(provider, providerEventId)` |
| `otp_challenge` | Temporary OTP challenges with expiry and attempt count |
| `system_setting` | Live key-value in-app configuration store for Payment API, SMS providers, and transit rules |
| `qr_login_session` | WhatsApp-style QR code dynamic session tokens with status and expiry |
| `app_session` | (Legacy from v0 — superseded by JWT. May be removed in future) |

### DB CHECK Constraints
Migration `20260808085150_add_check_constraints` adds:
- `chk_transaction_status` — restricts `transaction.status` to valid string values
- `chk_app_user_role` — restricts `app_user.role` to PASSENGER/DRIVER/ADMIN
- `chk_driver_verificationStatus` — restricts `driver_profile.verificationStatus`
- `chk_taxi_qr_status` — restricts `taxi_qr.status`

## Simulated vs. Real

| Feature | Status | Location |
|---|---|---|
| AddisPay checkout | **SIMULATED** | `backend/src/services/provider.ts` → `AddisPaySandboxProvider.initiatePayment()` |
| AddisPay webhook trigger | **SIMULATED** | Sandbox: POST to `/webhooks/addispay` with `x-addispay-signature: sandbox-signature` |
| OTP delivery (SMS) | **SIMULATED** | Logged to console in `backend/src/services/auth.service.ts#requestOtp` |
| Database persistence | **REAL** | SQL Server via Prisma |
| JWT auth (web: cookie, mobile: Bearer) | **REAL** | `backend/src/routes/auth.ts` + `backend/src/middlewares/auth.middleware.ts` |
| Driver registration | **REAL** | `backend/src/routes/drivers.ts` |
| QR lifecycle + PNG generation | **REAL** | `backend/src/routes/qr.ts` — PNG via `qrcode` npm |
| Payment flow (server validation) | **REAL** | `backend/src/routes/payments.ts` |
| Webhook idempotency + compare-and-set (fixed) | **REAL** | `backend/src/routes/webhooks.ts` |
| Mobile QR scanner | **REAL** | `mobile/App.tsx` — expo-camera CameraView + URL parsing |

## Naming & Coding Conventions
- All Express routes return `{ error: string }` on failure, correct data shape on success.
- Status transitions enforced server-side in `canTransition()` — never skip it on a webhook.
- Structured logging for transaction state changes: `console.log(JSON.stringify({ event, timestamp, transactionId, oldStatus, newStatus, source }))`.
- Webhook race conflicts logged as: `console.warn(JSON.stringify({ event: 'webhook_race_conflict', transactionId, attemptedTransition, actualStatus, eventId, source }))`.
- Foreign keys on `transaction` use `onDelete: NoAction` — financial records must never cascade-delete.
- All IDs are UUIDs (`@default(uuid())`).
- QR payload URL format: `https://paytaxi.et/t/{taxiId}` — never use custom schemes (breaks no-install fallback).
- Cookie auth uses `sameSite: 'strict'` — **requires same registrable domain in production**. Will silently fail cross-domain.
- Zod is available for additional input validation (not yet wired to routes — planned).

## CORS & Security
- **CORS Config**: `backend/src/index.ts` explicitly checks `allowedOrigins` (including `http://localhost:3000` and expo LAN IPs) and sets `credentials: true` for cookie auth.
- **Cookie Auth**: `sameSite: 'strict'` is used for web auth cookies — requires the frontend and backend to share the same registrable domain in production.
- **Camera Fallback**: Mobile app (`mobile/App.tsx`) handles denied camera permissions gracefully, providing a message and 'Cancel' button to fallback to manual text input.

## Automated Tests
- Location: `backend/src/__tests__/`
- Run: `cd backend && npx jest --config jest.config.json`
- `fares.test.ts` — state machine transitions (16 cases) + resolveFare presets/multipliers/bounds (8 cases)
- `webhooks.test.ts` — idempotency, compare-and-set race, terminal state protection (9 cases)
- `auth.service.test.ts` — OTP generation, hashing, attempt limits, expiration, and role validation
- `drivers.service.test.ts` — registration, approval, and QR replacement flows
- **Total: 50 tests, 4 suites, all passing**

- **Jest dependency pin**: root `package.json` → `pnpm.overrides` forces `jest-environment-node` to `30.4.1`. Without it, pnpm resolves `jest-runtime@30.4.2`'s `jest-environment-node` to `29.7.0` whose `jest-mock@29.7.0` moduleMocker lacks `clearMocksOnScope` → `TypeError` on suite start. Do not remove the override.

## Run Commands
- **Backend**: `cd backend && pnpm dev` — requires `backend/.env` with `DATABASE_URL`
- **Frontend**: `cd frontend && pnpm dev` — requires `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000`
- **Mobile**: `cd mobile && npx expo start` — requires `mobile/.env` with `EXPO_PUBLIC_API_URL=http://<LAN_IP>:5000`
- **Tests**: `cd backend && npx jest --config jest.config.json`

## Migration Commands (Backend)
```bash
cd backend
pnpm prisma:migrate   # creates tables in DB
pnpm prisma:seed      # seeds fake drivers/QRs/transactions
pnpm prisma:generate  # regenerates Prisma client after schema changes
```
