import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const otpChallenge = pgTable("otp_challenge", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  role: text("role").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: numeric("attempts").notNull().default("0"),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const appSession = pgTable("app_session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const appUser = pgTable("app_user", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  role: text("role").notNull().default("PASSENGER"), // PASSENGER | DRIVER | ADMIN
  name: text("name"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const driverProfile = pgTable("driver_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  nationalIdUrl: text("national_id_url"),
  licenseUrl: text("license_url"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleColor: text("vehicle_color"),
  plateNumber: text("plate_number").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  // PENDING | APPROVED | REJECTED
  verificationStatus: text("verification_status").notNull().default("PENDING"),
  addispaySubMerchantId: text("addispay_sub_merchant_id"),
  payoutAccountRef: text("payout_account_ref"),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const taxiQr = pgTable("taxi_qr", {
  id: text("id").primaryKey(),
  taxiId: text("taxi_id").notNull().unique(),
  driverProfileId: text("driver_profile_id").notNull(),
  // ACTIVE | DISABLED | REPLACED
  status: text("status").notNull().default("ACTIVE"),
  qrPayloadUrl: text("qr_payload_url").notNull(),
  backupCode: text("backup_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  disabledReason: text("disabled_reason"),
})

export const transaction = pgTable(
  "transaction",
  {
    id: text("id").primaryKey(),
    taxiQrId: text("taxi_qr_id").notNull(),
    driverProfileId: text("driver_profile_id").notNull(),
    passengerUserId: text("passenger_user_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("ETB"),
    // PENDING | SUCCESS | FAILED | REFUNDED | UNKNOWN
    status: text("status").notNull().default("PENDING"),
    addispayTransactionRef: text("addispay_transaction_ref").unique(),
    addispayRawPayload: jsonb("addispay_raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (t) => ({
    driverIdx: index("idx_tx_driver").on(t.driverProfileId),
    qrIdx: index("idx_tx_qr").on(t.taxiQrId),
    statusIdx: index("idx_tx_status").on(t.status),
    createdIdx: index("idx_tx_created").on(t.createdAt),
  }),
)

export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull().default("ADDISPAY"),
    // Provider-supplied unique event id. The unique constraint on this column
    // is what makes webhook processing idempotent: a duplicate delivery hits a
    // unique-violation on INSERT and is skipped instead of re-applied.
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type"),
    transactionId: text("transaction_id"),
    rawPayload: jsonb("raw_payload"),
    processed: boolean("processed").notNull().default(false),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerEventUnique: uniqueIndex("uniq_webhook_provider_event").on(
      t.provider,
      t.providerEventId,
    ),
  }),
)

export type DriverProfileRow = typeof driverProfile.$inferSelect
export type TaxiQrRow = typeof taxiQr.$inferSelect
export type TransactionRow = typeof transaction.$inferSelect
export type WebhookEventRow = typeof webhookEvent.$inferSelect
export type AppUserRow = typeof appUser.$inferSelect
export type OtpChallengeRow = typeof otpChallenge.$inferSelect
export type AppSessionRow = typeof appSession.$inferSelect
