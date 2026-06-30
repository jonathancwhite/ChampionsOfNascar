// Runs once when the Next.js server boots. Touching `serverEnv` here forces
// environment validation at startup, so a missing or malformed secret crashes
// the server immediately (fail fast) instead of on the first request that
// happens to need it. See src/lib/env.ts.
//
// Guarded to the Node.js runtime: the Edge runtime doesn't expose the same
// secrets and never runs the Prisma/pg stack, so validating there is moot.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { serverEnv } = await import("@/lib/env");
    // Access a field to defeat any dead-code elimination of the import.
    void serverEnv.DATABASE_URL;
  }
}
