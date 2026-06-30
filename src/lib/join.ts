// Join-by-code pure logic (NASCAR-030). Runtime-free of any `@/` value import
// so it unit-tests under the bare node runner. `joinLeague` in src/lib/leagues.ts
// does the DB work and delegates the decision to `classifyJoin`.

// Join codes use an unambiguous uppercase alphabet (see leagues.ts), so any
// input can be normalized to that shape: uppercase, then drop anything that
// isn't an allowed character (spaces, dashes a user might paste, etc.).
export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export type JoinDecision =
  { kind: "error"; error: string } | { kind: "join" } | { kind: "already" };

/**
 * Decide the outcome of a join attempt from the looked-up league state. Pure:
 * the caller supplies whether the league exists, its status, and whether the
 * user is already a member. Joining is allowed while `setup`/`active` and
 * blocked once `finished`.
 */
export function classifyJoin(input: {
  leagueExists: boolean;
  status?: string;
  alreadyMember: boolean;
}): JoinDecision {
  if (!input.leagueExists) {
    return {
      kind: "error",
      error: "That join code doesn't match any league.",
    };
  }
  if (input.status === "finished") {
    return {
      kind: "error",
      error: "This league has finished and is no longer accepting members.",
    };
  }
  if (input.alreadyMember) {
    return { kind: "already" };
  }
  return { kind: "join" };
}
