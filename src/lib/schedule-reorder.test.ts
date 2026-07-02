// Unit tests for schedule reorder helpers (NASCAR-089). No database.

import assert from "node:assert/strict";
import { test } from "node:test";

import { canMoveRace, validateRaceMove } from "./schedule-reorder";

const races = [
  { id: "r1", round: 1, status: "COMPLETED" },
  { id: "r2", round: 2, status: "SCHEDULED" },
  { id: "r3", round: 3, status: "SCHEDULED" },
  { id: "r4", round: 4, status: "SCHEDULED" },
];

test("validateRaceMove allows swapping adjacent non-completed races", () => {
  assert.deepEqual(validateRaceMove({ races, raceId: "r3", direction: "up" }), {
    ok: true,
    swapWithRaceId: "r2",
  });
});

test("validateRaceMove blocks moving a completed race", () => {
  const r = validateRaceMove({ races, raceId: "r1", direction: "down" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /completed/i);
});

test("validateRaceMove blocks moving past a completed race", () => {
  const r = validateRaceMove({ races, raceId: "r2", direction: "up" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /completed/i);
});

test("validateRaceMove blocks move up when already first movable slot", () => {
  const onlyCompleted = [{ id: "r1", round: 1, status: "COMPLETED" }];
  const r = validateRaceMove({
    races: onlyCompleted,
    raceId: "r1",
    direction: "up",
  });
  assert.equal(r.ok, false);
});

test("canMoveRace mirrors validateRaceMove", () => {
  assert.equal(canMoveRace(races, "r3", "down"), true);
  assert.equal(canMoveRace(races, "r1", "down"), false);
});
