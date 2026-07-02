// Pure delete-league helpers (NASCAR-087). No database imports — safe for
// client components that need confirmation validation without pulling in Prisma.

/** Maps auth failure reasons to user-facing copy for delete-league. */
export function deleteLeagueDeniedMessage(
  reason: "unauthenticated" | string,
): string {
  if (reason === "unauthenticated") return "You must be signed in.";
  return "Only admins can delete this league.";
}

/** Typed confirmation must exactly match the league name. */
export function isDeleteConfirmationValid(
  typed: string,
  leagueName: string,
): boolean {
  return typed.trim() === leagueName.trim();
}
