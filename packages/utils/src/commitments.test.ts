import assert from "node:assert/strict";
import test from "node:test";

import {
  formatFrequency,
  getUserLocalDateString,
  isValidTimezone,
  validateCommitmentInput,
} from "./commitments.ts";

test("isValidTimezone validates IANA timezone identifiers", () => {
  assert.equal(isValidTimezone("Asia/Kolkata"), true);
  assert.equal(isValidTimezone("America/New_York"), true);
  assert.equal(isValidTimezone("UTC"), true);
  assert.equal(isValidTimezone("Europe/London"), true);
  assert.equal(isValidTimezone("Invalid/Zone"), false);
  assert.equal(isValidTimezone(""), false);
});

test("getUserLocalDateString returns valid YYYY-MM-DD format", () => {
  const dateStr = getUserLocalDateString("UTC");
  assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
});

test("validateCommitmentInput validates required and optional fields", () => {
  const validDaily = validateCommitmentInput({
    title: "Solve 3 DSA Problems",
    frequency: "daily",
    tone: "sky",
  });
  assert.equal(validDaily.valid, true);
  assert.deepEqual(validDaily.errors, {});

  const emptyTitle = validateCommitmentInput({
    title: "",
    frequency: "daily",
  });
  assert.equal(emptyTitle.valid, false);
  assert.equal(emptyTitle.errors.title, "Commitment title is required");

  const missingDays = validateCommitmentInput({
    title: "Workout",
    frequency: "specific_days",
    schedule_days: [],
  });
  assert.equal(missingDays.valid, false);
  assert.equal(missingDays.errors.schedule_days, "Please select at least one day of the week");

  const invalidEndDate = validateCommitmentInput({
    title: "Read Book",
    frequency: "daily",
    start_date: "2026-10-20",
    end_date: "2026-10-10",
  });
  assert.equal(invalidEndDate.valid, false);
  assert.equal(invalidEndDate.errors.end_date, "End date cannot be earlier than start date");
});

test("formatFrequency formats daily and selected weekdays correctly", () => {
  assert.equal(formatFrequency("daily"), "Every day");
  assert.equal(formatFrequency("specific_days", [1, 2, 3, 4, 5]), "Weekdays (Mon–Fri)");
  assert.equal(formatFrequency("specific_days", [6, 7]), "Weekends (Sat–Sun)");
  assert.equal(formatFrequency("specific_days", [1, 3, 5]), "Mon · Wed · Fri");
  assert.equal(formatFrequency("specific_days", [1, 2, 3, 4, 5, 6, 7]), "Every day");
});
