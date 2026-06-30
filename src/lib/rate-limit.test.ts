// Unit tests for the rate-limit window math (NASCAR-082). No DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import { windowStartMs } from "./rate-limit";

test("windowStartMs floors to the window boundary", () => {
  const minute = 60_000;
  assert.equal(windowStartMs(0, minute), 0);
  assert.equal(windowStartMs(59_999, minute), 0);
  assert.equal(windowStartMs(60_000, minute), 60_000);
  assert.equal(windowStartMs(60_001, minute), 60_000);
  assert.equal(windowStartMs(125_000, minute), 120_000);
});

test("two timestamps in the same window share a start; the next rolls over", () => {
  const minute = 60_000;
  // Window 17 spans [1_020_000, 1_080_000).
  const a = windowStartMs(1_020_000, minute);
  const b = windowStartMs(1_079_999, minute);
  const c = windowStartMs(1_080_000, minute);
  assert.equal(a, 1_020_000);
  assert.equal(a, b);
  assert.equal(c, 1_080_000);
  assert.notEqual(b, c);
});
