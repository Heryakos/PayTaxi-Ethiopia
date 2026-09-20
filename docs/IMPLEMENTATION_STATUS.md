# Implemented (real, working logic in this preview)

- **Phone + OTP sessions:** `lib/auth/session.ts` normalizes phone numbers, creates hashed OTP challenges, limits attempts, verifies codes, creates DB-backed sessions, and sets the `paytaxi_session` httpOnly cookie. Routes: `app/api/auth/request-otp/route.ts`, `app/api/auth/verify-otp/route.ts`, and `app/api/auth/logout/route.ts`.
- **Role-aware access:** `requireRole()` in `lib/auth/session.ts` enforces DRIVER access for driver routes. `app/api/drivers/dashboard/route.ts` resolves the driver profile from the logged-in session user rather than accepting a driver ID from the client.
- **Driver registration:** `app/api/drivers/register/route.ts` and `lib/drivers/service.ts` persist driver name, phone ownership, vehicle data, plate, and mock document URLs. The profile is written as `PENDING`, then explicitly transitions to `APPROVED` in preview mode before issuing a QR.
- **QR lifecycle:** `lib/drivers/service.ts` issues an active QR only for the approved profile. `app/api/drivers/qr/replace/route.ts` and `replaceLostQr()` mark the current QR `REPLACED` with `LOST_OR_STOLEN`, then issue a new active QR, scoped to the authenticated driver.
- **Server-side fare and taxi validation:** `lib/payments/fares.ts` defines fixed ETB fare presets. `app/api/payments/initiate/route.ts` ignores client amount/currency, resolves the preset server-side, and requires an ACTIVE QR joined to an APPROVED driver before inserting a `PENDING` transaction.
- **Transaction transitions:** `lib/payments/fares.ts` exposes the explicit transition table. `app/api/webhooks/addispay/route.ts` rejects invalid statuses and illegal transitions; it uses a compare-and-set update on the current transaction status.
- **Webhook idempotency:** `lib/db/schema.ts` and `scripts/db-setup.mjs` define a unique `(provider, provider_event_id)` index. `app/api/webhooks/addispay/route.ts` inserts the event before processing and treats a unique violation as a duplicate delivery.
- **Database migration:** `scripts/db-setup.mjs` creates `otp_challenge` and `app_session`, upgrades `webhook_event`, and creates supporting indexes against the connected Neon database.
- **Preview UI wiring:** `components/paytaxi-app.tsx` exercises OTP login, driver registration, server-backed payment initiation, scoped dashboard loading, and lost/stolen QR replacement.

# Simulated/Mocked (works in preview but not production-real, e.g. AddisPay, OTP delivery)

- **OTP delivery:** `app/api/auth/request-otp/route.ts` returns `devCode` to the browser and logs it with `[v0]`; no SMS provider is called.
- **AddisPay:** `lib/payments/provider.ts` is `AddisPaySandboxProvider`; checkout initiation and webhook signature acceptance are simulated.
- **Driver approval:** `lib/drivers/service.ts` persists `PENDING` and immediately auto-approves in the same request for preview. No human/admin review occurs.
- **Document uploads:** `components/paytaxi-app.tsx` renders disabled mock ID/license file inputs; the registration route stores `mock://` URLs when none are supplied.
- **QR payload:** QR payload URLs and backup codes are generated locally; no printable QR asset or external QR service is connected.

# Not implemented / deferred (explicitly list what's missing — auth scoping if incomplete, admin console, mobile, i18n, rate limiting, refunds, etc.)

- **Real SMS OTP, carrier delivery, phone ownership checks, and production OTP throttling** are deferred; the preview exposes the OTP in `app/api/auth/request-otp/route.ts`.
- **Admin console and real approval/rejection workflow** are deferred; approval is the preview auto-transition in `lib/drivers/service.ts`.
- **Expo mobile app, Universal/App Links, deep links, and QR camera scanning** are deferred; this preview runs only the Next.js web app.
- **Production AddisPay credentials, checkout redirect, signature verification, settlement reconciliation, and real refunds** are deferred.
- **Refund API/UI** is not implemented even though `REFUNDED` is represented in the state machine.
- **Rate limiting, abuse detection, CSRF strategy beyond same-site cookies, audit logging, and account recovery** are deferred.
- **Real object storage for identity/license documents and image validation** are deferred.
- **Internationalization and Amharic translations** are deferred.

# Known limitations (anything you're unsure is fully correct, e.g. edge cases in the webhook idempotency logic)

- **Webhook retry window:** `app/api/webhooks/addispay/route.ts` records the unique event before loading the transaction. If a transaction is temporarily unavailable, the event can remain unprocessed and a retry is classified as a duplicate; production should add a retryable event state or process insert and transaction update in one carefully designed transaction.
- **Concurrent webhook races:** the compare-and-set update protects the transaction status, but the response does not inspect the affected-row count. A concurrent delivery with a different event can report processed even if its update was lost; the unique event constraint still prevents duplicate processing of the same provider event.
- **QR/taxi ID generation:** `lib/drivers/service.ts` uses random four-digit taxi IDs without a retry loop for the unlikely collision case.
- **Registration and QR issuance atomicity:** approval and QR insertion are separate statements in `lib/drivers/service.ts`; production should wrap them in a database transaction and add stronger rollback handling.
- **Session cleanup:** expired sessions and consumed OTP rows are not automatically garbage-collected.
- **Passenger payment authentication:** `app/api/payments/initiate/route.ts` now requires a PASSENGER session, but the UI does not restore an existing session on a full page reload; users may need to sign in again in that client state.
