// Unit tests for league lifecycle transitions (NASCAR-022). Pure, no DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  allowedNextStatuses,
  isValidStatusTransition,
  leagueStatusLabel,
} from "./league-status";

test("staying on the same status is always allowed", () => {
  for (const s of ["setup", "active", "finished"]) {
    assert.equal(isValidStatusTransition(s, s), true);
  }
});

test("forward transitions are allowed", () => {
  assert.equal(isValidStatusTransition("setup", "active"), true);
  assert.equal(isValidStatusTransition("active", "finished"), true);
});

test("backward and skip transitions are rejected", () => {
  assert.equal(isValidStatusTransition("active", "setup"), false);
  assert.equal(isValidStatusTransition("finished", "active"), false);
  assert.equal(isValidStatusTransition("finished", "setup"), false);
  assert.equal(isValidStatusTransition("setup", "finished"), false); // skips active
});

test("unknown statuses are rejected", () => {
  assert.equal(isValidStatusTransition("setup", "bogus"), false);
  assert.equal(isValidStatusTransition("bogus", "active"), false);
});

test("allowedNextStatuses includes current plus valid nexts", () => {
  assert.deepEqual(allowedNextStatuses("setup"), ["setup", "active"]);
  assert.deepEqual(allowedNextStatuses("active"), ["active", "finished"]);
  assert.deepEqual(allowedNextStatuses("finished"), ["finished"]);
});

test("leagueStatusLabel maps known statuses and falls back", () => {
  assert.equal(leagueStatusLabel("setup"), "Setup");
  assert.equal(leagueStatusLabel("active"), "Active");
  assert.equal(leagueStatusLabel("weird"), "weird");
});
