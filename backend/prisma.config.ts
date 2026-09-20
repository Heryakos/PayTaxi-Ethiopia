import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env before Prisma reads DATABASE_URL
config({ path: resolve(__dirname, '.env') })

// Prisma 7: connection URL is configured here, not in schema.prisma.
//
// Current: SQL Server (local) using Windows Integrated Security
// DATABASE_URL format: sqlserver://localhost:1433;database=paytaxi;integratedSecurity=true;trustServerCertificate=true;
//
// To switch to Supabase/PostgreSQL:
// 1. Change provider in schema.prisma to "postgresql"
// 2. Delete this prisma.config.ts (or update url here)
// 3. Set DATABASE_URL to: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  }
})
