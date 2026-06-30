// Unit tests for cron bearer auth (NASCAR-052). No DB.

import assert from "node:assert/strict";
import { test } from "node:test";

import { isAuthorizedCron } from "./cron-auth";

const SECRET = "super-secret-cron-token";

test("accepts the exact Bearer secret", () => {
  assert.equal(isAuthorizedCron(`Bearer ${SECRET}`, SECRET), true);
});

test("rejects a wrong, missing, or malformed header", () => {
  assert.equal(isAuthorizedCron("Bearer nope", SECRET), false);
  assert.equal(isAuthorizedCron(SECRET, SECRET), false); // no "Bearer " prefix
  assert.equal(isAuthorizedCron(null, SECRET), false);
  assert.equal(isAuthorizedCron("", SECRET), false);
});

test("never authorizes when the secret is empty", () => {
  assert.equal(isAuthorizedCron("Bearer ", ""), false);
  assert.equal(isAuthorizedCron(null, ""), false);
});
