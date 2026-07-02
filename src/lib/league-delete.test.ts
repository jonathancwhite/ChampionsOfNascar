// Unit tests for delete-league helpers (NASCAR-087). No database.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deleteLeagueDeniedMessage,
  isDeleteConfirmationValid,
} from "./league-delete";

test("deleteLeagueDeniedMessage maps unauthenticated", () => {
  assert.equal(
    deleteLeagueDeniedMessage("unauthenticated"),
    "You must be signed in.",
  );
});

test("deleteLeagueDeniedMessage maps non-admin roles", () => {
  assert.equal(
    deleteLeagueDeniedMessage("insufficient-role"),
    "Only admins can delete this league.",
  );
  assert.equal(
    deleteLeagueDeniedMessage("not-member"),
    "Only admins can delete this league.",
  );
});

test("isDeleteConfirmationValid requires an exact trimmed match", () => {
  assert.equal(isDeleteConfirmationValid("Test League", "Test League"), true);
  assert.equal(
    isDeleteConfirmationValid("  Test League  ", "Test League"),
    true,
  );
  assert.equal(isDeleteConfirmationValid("test league", "Test League"), false);
  assert.equal(isDeleteConfirmationValid("Wrong", "Test League"), false);
  assert.equal(isDeleteConfirmationValid("", "Test League"), false);
});
