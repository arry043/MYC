import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCommitmentDate,
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

test("validateCommitmentInput validates single_day commitments", () => {
  const today = getUserLocalDateString("Asia/Kolkata");

  // Valid single day commitment today
  const validToday = validateCommitmentInput(
    {
      title: "Dentist Appointment",
      frequency: "single_day",
      scheduled_date: today,
    },
    "Asia/Kolkata",
  );
  assert.equal(validToday.valid, true);
  assert.deepEqual(validToday.errors, {});

  // Valid future single day commitment
  const validFuture = validateCommitmentInput(
    {
      title: "Conference in London",
      frequency: "single_day",
      scheduled_date: "2026-12-15",
    },
    "Asia/Kolkata",
  );
  assert.equal(validFuture.valid, true);

  // Missing scheduled_date
  const missingDate = validateCommitmentInput({
    title: "One time task",
    frequency: "single_day",
    scheduled_date: "",
  });
  assert.equal(missingDate.valid, false);
  assert.equal(missingDate.errors.scheduled_date, "Please select a date for this commitment");

  // Invalid date format
  const invalidFormat = validateCommitmentInput({
    title: "One time task",
    frequency: "single_day",
    scheduled_date: "15/12/2026",
  });
  assert.equal(invalidFormat.valid, false);
  assert.equal(invalidFormat.errors.scheduled_date, "Invalid date format (must be YYYY-MM-DD)");

  // Past date rejected
  const pastDate = validateCommitmentInput(
    {
      title: "Past Meeting",
      frequency: "single_day",
      scheduled_date: "2026-01-01",
    },
    "Asia/Kolkata",
  );
  assert.equal(pastDate.valid, false);
  assert.equal(pastDate.errors.scheduled_date, "Scheduled date cannot be in the past");
});

test("formatFrequency formats daily, selected weekdays, and single day correctly", () => {
  assert.equal(formatFrequency("daily"), "Every day");
  assert.equal(formatFrequency("specific_days", [1, 2, 3, 4, 5]), "Weekdays (Mon–Fri)");
  assert.equal(formatFrequency("specific_days", [6, 7]), "Weekends (Sat–Sun)");
  assert.equal(formatFrequency("specific_days", [1, 3, 5]), "Mon · Wed · Fri");
  assert.equal(formatFrequency("specific_days", [1, 2, 3, 4, 5, 6, 7]), "Every day");
  assert.equal(formatFrequency("single_day"), "Single day");
  assert.equal(formatFrequency("single_day", null, "2026-11-20"), "Single day · Nov 20, 2026");
});

test("formatCommitmentDate formats date string", () => {
  assert.equal(formatCommitmentDate("2026-11-20"), "Nov 20, 2026");
  assert.equal(formatCommitmentDate("2026-01-05"), "Jan 5, 2026");
});
