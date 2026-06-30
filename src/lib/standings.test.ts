// Unit tests for championship standings (NASCAR-070). Pure, no database —
// runs under `npm test` (node --import tsx --test).

import assert from "node:assert/strict";
import { test } from "node:test";

import { computeStandings, type StandingInputRow } from "./standings";

// Build a result row with sensible defaults.
function row(
  membershipId: string | null,
  finishPos: number,
  points: number,
  extra: Partial<StandingInputRow> = {},
): StandingInputRow {
  return {
    membershipId,
    isAi: false,
    driverName: membershipId ?? "AI",
    finishPos,
    points,
    ...extra,
  };
}

test("sums points per driver across races and ranks by total", () => {
  const standings = computeStandings([
    row("alice", 1, 40),
    row("bob", 2, 35),
    row("alice", 3, 30),
    row("bob", 1, 40),
  ]);

  assert.equal(standings.length, 2);
  // bob: 75, alice: 70 → bob leads.
  assert.deepEqual(
    standings.map((s) => [s.rank, s.membershipId, s.points]),
    [
      [1, "bob", 75],
      [2, "alice", 70],
    ],
  );
});

test("excludes AI drivers from the championship table", () => {
  const standings = computeStandings([
    row("alice", 2, 35),
    {
      membershipId: null,
      isAi: true,
      driverName: "AI Kyle",
      finishPos: 1,
      points: 40,
    },
  ]);

  assert.equal(standings.length, 1);
  assert.equal(standings[0].membershipId, "alice");
});

test("tiebreaker 1: equal points broken by total wins", () => {
  const standings = computeStandings([
    // alice and bob both finish on 80 points.
    row("alice", 1, 40),
    row("alice", 5, 40),
    row("bob", 2, 40),
    row("bob", 2, 40),
  ]);

  assert.equal(standings[0].points, standings[1].points); // both 80
  // alice has a win, bob has none → alice ranks first.
  assert.deepEqual(
    standings.map((s) => [s.rank, s.membershipId, s.wins]),
    [
      [1, "alice", 1],
      [2, "bob", 0],
    ],
  );
});

test("tiebreaker 2: equal points and wins broken by best finishes", () => {
  const standings = computeStandings([
    // Both 1 win and equal points; alice has a 2nd, bob has a 4th.
    row("alice", 1, 40),
    row("alice", 2, 35),
    row("bob", 1, 40),
    row("bob", 4, 35),
  ]);

  assert.equal(standings[0].points, standings[1].points);
  assert.equal(standings[0].wins, standings[1].wins);
  // alice's better second-best finish (P2 vs P4) wins the tiebreak.
  assert.deepEqual(
    standings.map((s) => s.membershipId),
    ["alice", "bob"],
  );
});

test("computes columns: starts, wins, top5, top10, avgFinish", () => {
  const [alice] = computeStandings([
    row("alice", 1, 40),
    row("alice", 4, 31),
    row("alice", 12, 20),
  ]);

  assert.equal(alice.starts, 3);
  assert.equal(alice.wins, 1);
  assert.equal(alice.top5, 2); // P1, P4
  assert.equal(alice.top10, 2); // P1, P4 (P12 excluded)
  assert.equal(alice.avgFinish, (1 + 4 + 12) / 3);
});

test("fully-tied drivers share a rank", () => {
  const standings = computeStandings([row("alice", 1, 40), row("bob", 1, 40)]);
  // Identical points/wins/finishes → both rank 1.
  assert.deepEqual(
    standings.map((s) => s.rank),
    [1, 1],
  );
});

test("empty input yields empty standings", () => {
  assert.deepEqual(computeStandings([]), []);
});
