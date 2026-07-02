// Unit tests for the schedule randomizer (NASCAR-040). Runs under the bare
// node test runner (`npm test`) — no database. The pure helpers are exercised
// directly; `generateSchedule` is driven through a hand-rolled fake transaction
// client so we can assert the query shape and the rows it would write.

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Prisma } from "@/generated/prisma/client";
import {
  ScheduleError,
  generateSchedule,
  mulberry32,
  pickTracks,
  shuffle,
  validateRaceCountAdjust,
  validateTrackSwap,
} from "./schedule";

const trackIds = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `track-${i + 1}` }));

test("mulberry32 is deterministic for a given seed", () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  const seqA = [a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  // Different seed → different stream.
  const c = mulberry32(124);
  assert.notDeepEqual([c(), c(), c(), c()], seqA);
});

test("shuffle is a permutation (no loss, no dup) and does not mutate input", () => {
  const input = trackIds(20);
  const frozen = [...input];
  const out = shuffle(input, mulberry32(7));
  assert.equal(out.length, input.length);
  assert.deepEqual(
    new Set(out.map((t) => t.id)),
    new Set(input.map((t) => t.id)),
  );
  assert.deepEqual(input, frozen, "input array must be untouched");
});

test("shuffle is deterministic under a seeded rng", () => {
  const input = trackIds(12);
  const a = shuffle(input, mulberry32(42)).map((t) => t.id);
  const b = shuffle(input, mulberry32(42)).map((t) => t.id);
  assert.deepEqual(a, b);
});

test("pickTracks returns the requested count with no repeats", () => {
  const picked = pickTracks(trackIds(30), 10, mulberry32(99));
  assert.equal(picked.length, 10);
  assert.equal(new Set(picked.map((t) => t.id)).size, 10);
});

test("pickTracks rejects count greater than the pool (cap-at-pool guard)", () => {
  assert.throws(() => pickTracks(trackIds(5), 6, mulberry32(1)), ScheduleError);
});

test("pickTracks rejects a count below 1", () => {
  assert.throws(() => pickTracks(trackIds(5), 0, mulberry32(1)), ScheduleError);
});

// A minimal fake of the bits of the transaction client generateSchedule touches.
function makeFakeTx(pool: { id: string }[]) {
  const calls = {
    findManyWhere: undefined as unknown,
    createdData: [] as Array<{
      leagueId: string;
      trackId: string;
      round: number;
    }>,
  };
  const tx = {
    track: {
      findMany: async (args: { where?: unknown }) => {
        calls.findManyWhere = args.where;
        return pool;
      },
    },
    race: {
      createMany: async (args: { data: typeof calls.createdData }) => {
        calls.createdData = args.data;
        return { count: args.data.length };
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, calls };
}

test("generateSchedule filters tracks by series and active flag", async () => {
  const { tx, calls } = makeFakeTx(trackIds(8));
  await generateSchedule(
    tx,
    { leagueId: "lg1", series: "CUP", numberOfRaces: 5 },
    mulberry32(3),
  );
  assert.deepEqual(calls.findManyWhere, {
    active: true,
    series: { has: "CUP" },
  });
});

test("generateSchedule writes N rounds numbered 1..N with no repeated tracks", async () => {
  const { tx, calls } = makeFakeTx(trackIds(15));
  const count = await generateSchedule(
    tx,
    { leagueId: "lg1", series: "TRUCK", numberOfRaces: 10 },
    mulberry32(2024),
  );

  assert.equal(count, 10);
  assert.equal(calls.createdData.length, 10);
  // Rounds are exactly 1..10 in order.
  assert.deepEqual(
    calls.createdData.map((r) => r.round),
    Array.from({ length: 10 }, (_, i) => i + 1),
  );
  // No track is scheduled twice, and all belong to this league.
  assert.equal(new Set(calls.createdData.map((r) => r.trackId)).size, 10);
  assert.ok(calls.createdData.every((r) => r.leagueId === "lg1"));
});

test("generateSchedule is deterministic for a fixed seed", async () => {
  const a = makeFakeTx(trackIds(20));
  const b = makeFakeTx(trackIds(20));
  await generateSchedule(
    a.tx,
    { leagueId: "lg1", series: "CUP", numberOfRaces: 12 },
    mulberry32(555),
  );
  await generateSchedule(
    b.tx,
    { leagueId: "lg1", series: "CUP", numberOfRaces: 12 },
    mulberry32(555),
  );
  assert.deepEqual(
    a.calls.createdData.map((r) => r.trackId),
    b.calls.createdData.map((r) => r.trackId),
  );
});

// --- Track swap rules (NASCAR-041) --------------------------------------------

const okSwap = {
  raceFound: true,
  raceCompleted: false,
  newTrackInSeries: true,
  newTrackAlreadyUsed: false,
};

test("validateTrackSwap allows a valid swap", () => {
  assert.deepEqual(validateTrackSwap(okSwap), { ok: true });
});

test("validateTrackSwap rejects an unknown race", () => {
  const r = validateTrackSwap({ ...okSwap, raceFound: false });
  assert.equal(r.ok, false);
});

test("validateTrackSwap blocks a completed race", () => {
  const r = validateTrackSwap({ ...okSwap, raceCompleted: true });
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /completed/i);
});

test("validateTrackSwap rejects a track outside the league's series", () => {
  const r = validateTrackSwap({ ...okSwap, newTrackInSeries: false });
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /series/i);
});

test("validateTrackSwap enforces the no-repeat rule", () => {
  const r = validateTrackSwap({ ...okSwap, newTrackAlreadyUsed: true });
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /already used/i);
});

// --- Race count adjust (NASCAR-088) -------------------------------------------

const baseRaces = Array.from({ length: 12 }, (_, i) => ({
  round: i + 1,
  status: "SCHEDULED",
}));

test("validateRaceCountAdjust allows increase when unused tracks remain", () => {
  assert.deepEqual(
    validateRaceCountAdjust({
      currentCount: 12,
      newCount: 15,
      maxPool: 20,
      leagueStatus: "active",
      races: baseRaces,
    }),
    { ok: true },
  );
});

test("validateRaceCountAdjust blocks decrease when a completed tail race would be removed", () => {
  const races = [...baseRaces.slice(0, 11), { round: 12, status: "COMPLETED" }];
  const r = validateRaceCountAdjust({
    currentCount: 12,
    newCount: 11,
    maxPool: 20,
    leagueStatus: "active",
    races,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /round 12/i);
});

test("validateRaceCountAdjust allows decrease when tail races are not completed", () => {
  assert.deepEqual(
    validateRaceCountAdjust({
      currentCount: 12,
      newCount: 10,
      maxPool: 20,
      leagueStatus: "setup",
      races: baseRaces,
    }),
    { ok: true },
  );
});

test("validateRaceCountAdjust blocks finished leagues", () => {
  const r = validateRaceCountAdjust({
    currentCount: 12,
    newCount: 10,
    maxPool: 20,
    leagueStatus: "finished",
    races: baseRaces,
  });
  assert.equal(r.ok, false);
});

test("validateRaceCountAdjust returns noop when count is unchanged", () => {
  assert.deepEqual(
    validateRaceCountAdjust({
      currentCount: 12,
      newCount: 12,
      maxPool: 20,
      leagueStatus: "active",
      races: baseRaces,
    }),
    { ok: true, noop: true },
  );
});
