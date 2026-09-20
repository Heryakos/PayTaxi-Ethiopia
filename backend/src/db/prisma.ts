import { PrismaClient } from '@prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env') })

const connectionString = process.env.DATABASE_URL!
let _prisma: PrismaClient | null = null

export async function getPrisma(): Promise<PrismaClient> {
  if (_prisma) return _prisma
  const adapter = new PrismaMssql(connectionString)
  _prisma = new PrismaClient({ adapter } as any)
  return _prisma
}

export let prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      throw new Error('Prisma not initialized yet. Call getPrisma() first in src/index.ts startup.')
    }
    return (_prisma as any)[prop]
  }
})
