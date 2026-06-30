// Unit tests for the points scheme + calculator (NASCAR-023). No DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_SCHEME,
  basePointsFor,
  computePoints,
  pointsSchemeSchema,
  resolveScheme,
  validateFinishingOrder,
  type PointsScheme,
} from "./points";

test("default scheme: 1st=40, 2nd=35, 3rd=34, then −1 per position", () => {
  assert.equal(basePointsFor(DEFAULT_SCHEME, 1), 40);
  assert.equal(basePointsFor(DEFAULT_SCHEME, 2), 35);
  assert.equal(basePointsFor(DEFAULT_SCHEME, 3), 34);
  assert.equal(basePointsFor(DEFAULT_SCHEME, 4), 33);
  assert.equal(basePointsFor(DEFAULT_SCHEME, 10), 27);
});

test("default scheme floors at 1 beyond the table", () => {
  assert.equal(basePointsFor(DEFAULT_SCHEME, 36), 1);
  assert.equal(basePointsFor(DEFAULT_SCHEME, 40), 1);
  // A position past the 40-long table still earns the floor.
  assert.equal(basePointsFor(DEFAULT_SCHEME, 99), 1);
});

test("default scheme has no bonuses", () => {
  assert.equal(
    computePoints({ finishPos: 1, lapsLed: 50 }, DEFAULT_SCHEME).points,
    40,
  );
});

const CUSTOM: PointsScheme = {
  version: 1,
  table: [100, 80, 60],
  bonuses: { win: 5, lapsLed: 3 },
};

test("custom scheme awards win + laps-led bonuses", () => {
  // P1 leading laps: base 100 + win 5 + ledLap 3 = 108.
  assert.deepEqual(computePoints({ finishPos: 1, lapsLed: 12 }, CUSTOM), {
    basePoints: 100,
    bonusPoints: 8,
    points: 108,
  });
  // P2, no laps led: base 80, no bonuses.
  assert.deepEqual(computePoints({ finishPos: 2, lapsLed: 0 }, CUSTOM), {
    basePoints: 80,
    bonusPoints: 0,
    points: 80,
  });
  // Below the custom table → floor 1, plus led-lap bonus.
  assert.deepEqual(computePoints({ finishPos: 7, lapsLed: 1 }, CUSTOM), {
    basePoints: 1,
    bonusPoints: 3,
    points: 4,
  });
});

test("schema rejects negative points and malformed tables", () => {
  assert.equal(
    pointsSchemeSchema.safeParse({ ...CUSTOM, table: [10, -1] }).success,
    false,
  );
  assert.equal(
    pointsSchemeSchema.safeParse({ ...CUSTOM, table: [] }).success,
    false,
  );
  assert.equal(
    pointsSchemeSchema.safeParse({ ...CUSTOM, table: [1.5] }).success,
    false,
  );
  assert.equal(
    pointsSchemeSchema.safeParse({
      version: 1,
      table: [1],
      bonuses: { win: -1, lapsLed: 0 },
    }).success,
    false,
  );
});

test("resolveScheme falls back to default for null or junk", () => {
  assert.equal(resolveScheme(null), DEFAULT_SCHEME);
  assert.equal(resolveScheme(undefined), DEFAULT_SCHEME);
  assert.equal(resolveScheme({ nope: true }), DEFAULT_SCHEME);
  assert.deepEqual(resolveScheme(CUSTOM), CUSTOM);
});

test("validateFinishingOrder accepts a 1..N permutation", () => {
  assert.deepEqual(validateFinishingOrder([3, 1, 2]), { ok: true });
});

test("validateFinishingOrder rejects duplicates, gaps, and out-of-range", () => {
  assert.equal(validateFinishingOrder([1, 1, 2]).ok, false); // dup
  assert.equal(validateFinishingOrder([1, 2, 4]).ok, false); // gap (4 > N=3)
  assert.equal(validateFinishingOrder([0, 1, 2]).ok, false); // below 1
  assert.equal(validateFinishingOrder([]).ok, false); // empty
});
