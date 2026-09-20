import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

// A single shared pool for the whole app. Reused across hot-reloads in dev.
const globalForDb = globalThis as unknown as { __paytaxiPool?: Pool }

export const pool =
  globalForDb.__paytaxiPool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__paytaxiPool = pool
}

export const db = drizzle(pool, { schema })
export { schema }
