// Unit tests for display-name validation (NASCAR-086). No database.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DISPLAY_NAME_MAX_LENGTH,
  hasUsableDisplayName,
  validateDisplayName,
} from "./display-name";

test("hasUsableDisplayName rejects null, blank, and whitespace-only", () => {
  assert.equal(hasUsableDisplayName(null), false);
  assert.equal(hasUsableDisplayName(""), false);
  assert.equal(hasUsableDisplayName("   "), false);
});

test("hasUsableDisplayName accepts trimmed non-empty names", () => {
  assert.equal(hasUsableDisplayName("  Chase  "), true);
  assert.equal(hasUsableDisplayName("Driver"), true);
});

test("validateDisplayName trims and accepts a valid name", () => {
  assert.deepEqual(validateDisplayName("  Kyle Busch  "), {
    ok: true,
    name: "Kyle Busch",
  });
});

test("validateDisplayName rejects empty and whitespace-only input", () => {
  assert.deepEqual(validateDisplayName(""), {
    ok: false,
    error: "Display name is required.",
  });
  assert.deepEqual(validateDisplayName("   "), {
    ok: false,
    error: "Display name is required.",
  });
});

test("validateDisplayName rejects names over the max length", () => {
  const tooLong = "a".repeat(DISPLAY_NAME_MAX_LENGTH + 1);
  const result = validateDisplayName(tooLong);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /50 characters/);
  }
});

test("validateDisplayName accepts a name at the max length", () => {
  const max = "a".repeat(DISPLAY_NAME_MAX_LENGTH);
  assert.deepEqual(validateDisplayName(max), { ok: true, name: max });
});
