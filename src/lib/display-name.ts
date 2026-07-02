// Pure display-name helpers (NASCAR-086). Safe for client and server imports —
// keep this module free of Prisma/Clerk so client components can use it.

export const DISPLAY_NAME_MAX_LENGTH = 50;

/** True when the stored name is non-empty after trim. */
export function hasUsableDisplayName(name: string | null | undefined): boolean {
  return Boolean(name?.trim());
}

export type ValidateDisplayNameResult =
  { ok: true; name: string } | { ok: false; error: string };

/** Validates a raw display-name input for the first-login prompt. */
export function validateDisplayName(raw: string): ValidateDisplayNameResult {
  const name = raw.trim();
  if (!name) {
    return { ok: false, error: "Display name is required." };
  }
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, name };
}
