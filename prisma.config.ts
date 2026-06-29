import "dotenv/config";

import { defineConfig, env } from "prisma/config";

// Prisma 7 moves the migrate/introspect connection URL out of schema.prisma
// and into this config. The runtime client connects via the driver adapter
// in src/lib/db.ts instead.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` (prisma db seed) runs this after migrations.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Direct (unpooled) connection for migrations. With a pooled DATABASE_URL
    // (e.g. Neon), set DIRECT_URL to the unpooled string; otherwise point
    // both at the same database.
    url: env("DIRECT_URL"),
  },
});
