// Centralized, validated environment access (NASCAR-004).
//
// Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle at build time and
// keeps everything else server-only. We mirror that split here so a server
// secret can never be pulled into client code:
//
//   - `clientEnv`  — public vars, safe to read anywhere (parsed eagerly).
//   - `serverEnv`  — secrets, server-only. Parsed eagerly on the server so a
//                    missing/invalid var crashes at boot; on the client it is a
//                    Proxy that throws on access (so merely bundling this module
//                    into client code never leaks or evaluates a secret).
//
// Validation throws a single aggregated error listing every offending var, so
// misconfiguration fails fast and loud instead of as a vague `undefined` deep in
// a request handler. See `src/instrumentation.ts`, which touches `serverEnv` at
// server startup to guarantee boot-time validation.

import { z } from "zod";

const serverSchema = z.object({
  // Pooled runtime connection used by the Prisma driver adapter (src/lib/db.ts).
  DATABASE_URL: z.url(),
  // Unpooled connection for migrations (prisma.config.ts). Optional: set it only
  // when DATABASE_URL points at a pooler (e.g. Neon/PgBouncer); otherwise the
  // config falls back to DATABASE_URL.
  DIRECT_URL: z.url().optional(),
  // Clerk server-side secret (NASCAR-010) and webhook signing secret (NASCAR-011).
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  // Resend transactional email (NASCAR-051/052/053).
  RESEND_API_KEY: z.string().min(1),
  // Verified "From" address, e.g. `NASCAR 25 <noreply@yourdomain.com>`.
  EMAIL_FROM: z.string().min(1),
  // High-entropy shared secret guarding the reminder cron route (NASCAR-052).
  CRON_SECRET: z.string().min(1),
});

const clientSchema = z.object({
  // Clerk publishable (browser) key (NASCAR-010).
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  // Clerk routing. Clerk reads these directly; declared here so they are
  // documented and shape-checked. Optional — Clerk falls back to its hosted
  // Account Portal when unset, but set them to the local routes below so
  // middleware redirects and the <SignIn>/<SignUp> components stay in-app.
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().optional(),
  // Public origin used to build absolute URLs in emails and links.
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function parse<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
  scope: "server" | "client",
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid ${scope} environment variables:\n${issues}\n` +
        `Check your .env against .env.example.`,
    );
  }
  return result.data;
}

// Reference each `NEXT_PUBLIC_*` var statically so Next.js inlines it; a dynamic
// `process.env[key]` lookup would not be replaced at build time.
const clientSource = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL:
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

export const clientEnv: ClientEnv = parse(clientSchema, clientSource, "client");

const serverOnlyProxy = new Proxy({} as ServerEnv, {
  get(_target, prop) {
    throw new Error(
      `serverEnv.${String(prop)} is server-only and was read in the browser. ` +
        `Use clientEnv (NEXT_PUBLIC_*) for values the client needs.`,
    );
  },
});

export const serverEnv: ServerEnv =
  typeof window === "undefined"
    ? parse(serverSchema, process.env, "server")
    : serverOnlyProxy;
