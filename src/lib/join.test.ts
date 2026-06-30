// Unit tests for join-by-code pure logic (NASCAR-030). No database — covers the
// normalization, invalid, finished, already-member, and joinable paths.

import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyJoin, normalizeJoinCode } from "./join";

test("normalizeJoinCode uppercases and strips noise", () => {
  assert.equal(normalizeJoinCode("abcd2345"), "ABCD2345");
  assert.equal(normalizeJoinCode("  abcd 2345 "), "ABCD2345");
  assert.equal(normalizeJoinCode("abcd-2345"), "ABCD2345");
  assert.equal(normalizeJoinCode(""), "");
});

test("unknown code → error", () => {
  assert.deepEqual(
    classifyJoin({ leagueExists: false, alreadyMember: false }),
    {
      kind: "error",
      error: "That join code doesn't match any league.",
    },
  );
});

test("finished league → blocked", () => {
  const decision = classifyJoin({
    leagueExists: true,
    status: "finished",
    alreadyMember: false,
  });
  assert.equal(decision.kind, "error");
});

test("already a member → 'already' (no duplicate)", () => {
  assert.deepEqual(
    classifyJoin({ leagueExists: true, status: "active", alreadyMember: true }),
    { kind: "already" },
  );
});

test("setup/active league, not yet a member → join", () => {
  assert.deepEqual(
    classifyJoin({ leagueExists: true, status: "setup", alreadyMember: false }),
    { kind: "join" },
  );
  assert.deepEqual(
    classifyJoin({
      leagueExists: true,
      status: "active",
      alreadyMember: false,
    }),
    { kind: "join" },
  );
});

test("already-member takes precedence even in a finished league is NOT allowed", () => {
  // Finished is checked before membership: a finished league is blocked
  // regardless, which is the intended guard.
  const decision = classifyJoin({
    leagueExists: true,
    status: "finished",
    alreadyMember: true,
  });
  assert.equal(decision.kind, "error");
});
