import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Reuse a single PrismaClient across hot-reloads in development to avoid
// exhausting the connection pool with a new client on every module reload.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Prisma 7 connects through a driver adapter rather than a built-in engine.
// PrismaPg pools over node-postgres and works with Neon/Supabase Postgres.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
