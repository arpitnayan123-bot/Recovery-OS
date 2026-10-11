import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
/* Gap 16: MULTI-TENANT SAFETY NOTICE
 * In the current sandbox, all orgs share one SQLite database with orgId
 * scoping in every query. For production:
 * 1. Use PostgreSQL with Row Level Security (RLS) policies on every table
 *    that scope rows by orgId automatically — so even a bug in a WHERE
 *    clause can't leak another org's data.
 * 2. Set the RLS policy to use the session's orgId (set via a transaction
 *    variable or middleware).
 * 3. Never trust client-supplied orgId — always derive it from the session
 *    cookie (getSessionOrg()).
 * 4. Add an integration test that verifies cross-org data isolation.
 */
