import test from "node:test";
import assert from "node:assert/strict";
import { validateGuardInterval } from "./guard-validation.mjs";

test("accepts a valid Cameroon-local ISO interval with an explicit offset", () => {
  assert.deepEqual(
    validateGuardInterval(
      "2026-11-17T08:00:00+01:00",
      "2026-11-18T08:00:00+01:00",
    ),
    {
      valid: true,
      reason: null,
    },
  );
});

test("rejects an interval whose end is not after its start", () => {
  assert.equal(
    validateGuardInterval(
      "2026-11-17T08:00:00+01:00",
      "2026-11-17T08:00:00+01:00",
    ).reason,
    "non-positive-window",
  );
});

test("rejects a guard window longer than 15 days", () => {
  assert.equal(
    validateGuardInterval(
      "2026-11-01T08:00:00+01:00",
      "2026-11-17T08:00:00+01:00",
    ).reason,
    "over-15-days",
  );
});

test("rejects malformed timestamps", () => {
  assert.equal(
    validateGuardInterval("not-a-date", "2026-11-18T08:00:00+01:00").reason,
    "invalid-date",
  );
});
