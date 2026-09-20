import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!connectionString) {
  console.error("[db-setup] Missing DATABASE_URL / POSTGRES_URL")
  process.exit(1)
}

const pool = new Pool({ connectionString })

const statements = [
  `CREATE TABLE IF NOT EXISTS otp_challenge (
    id text PRIMARY KEY,
    phone text NOT NULL,
    role text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts numeric NOT NULL DEFAULT 0,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS app_session (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS app_user (
    id text PRIMARY KEY,
    phone text UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'PASSENGER',
    name text,
    is_verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS driver_profile (
    id text PRIMARY KEY,
    user_id text NOT NULL,
    display_name text NOT NULL,
    national_id_url text,
    license_url text,
    vehicle_make text,
    vehicle_model text,
    vehicle_color text,
    plate_number text NOT NULL,
    profile_photo_url text,
    verification_status text NOT NULL DEFAULT 'PENDING',
    addispay_sub_merchant_id text,
    payout_account_ref text,
    rating numeric(3,2) NOT NULL DEFAULT 5.00,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE TABLE IF NOT EXISTS taxi_qr (
    id text PRIMARY KEY,
    taxi_id text UNIQUE NOT NULL,
    driver_profile_id text NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE',
    qr_payload_url text NOT NULL,
    backup_code text,
    created_at timestamptz NOT NULL DEFAULT now(),
    disabled_at timestamptz,
    disabled_reason text
  )`,

  `CREATE TABLE IF NOT EXISTS transaction (
    id text PRIMARY KEY,
    taxi_qr_id text NOT NULL,
    driver_profile_id text NOT NULL,
    passenger_user_id text,
    amount numeric(12,2) NOT NULL,
    currency text NOT NULL DEFAULT 'ETB',
    status text NOT NULL DEFAULT 'PENDING',
    addispay_transaction_ref text UNIQUE,
    addispay_raw_payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz
  )`,

  `CREATE TABLE IF NOT EXISTS webhook_event (
    id text PRIMARY KEY,
    provider text NOT NULL DEFAULT 'ADDISPAY',
    provider_event_id text NOT NULL DEFAULT '',
    event_type text,
    transaction_id text,
    raw_payload jsonb,
    processed boolean NOT NULL DEFAULT false,
    received_at timestamptz NOT NULL DEFAULT now()
  )`,

  // Bring an older webhook_event table up to date if it predates these columns.
  `ALTER TABLE webhook_event ADD COLUMN IF NOT EXISTS provider_event_id text NOT NULL DEFAULT ''`,
  `ALTER TABLE webhook_event ADD COLUMN IF NOT EXISTS transaction_id text`,

  // Idempotency guarantee: no two rows can share (provider, provider_event_id).
  `CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_provider_event ON webhook_event (provider, provider_event_id)`,

  `CREATE INDEX IF NOT EXISTS idx_tx_driver ON transaction (driver_profile_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_qr ON transaction (taxi_qr_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_status ON transaction (status)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_created ON transaction (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_session_user ON app_session (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenge (phone)`,
  `CREATE INDEX IF NOT EXISTS idx_driver_user ON driver_profile (user_id)`,
]

async function main() {
  const client = await pool.connect()
  try {
    for (const sql of statements) {
      await client.query(sql)
    }
    console.log("[db-setup] Schema ready")
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error("[db-setup] Failed:", err)
  process.exit(1)
})
