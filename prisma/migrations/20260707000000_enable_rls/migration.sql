-- Enable Row Level Security on all application tables.
--
-- Auth and authorization live in the Next.js app (Clerk + Prisma). These tables
-- are not queried through the Supabase client. Enabling RLS blocks direct
-- PostgREST access via the anon/authenticated roles while Prisma (postgres role)
-- and migrations continue to work unchanged.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "League" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeagueMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Track" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Race" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RaceParticipant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RaceResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CronRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
