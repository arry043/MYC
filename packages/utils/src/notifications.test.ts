import assert from "node:assert/strict";
import test from "node:test";

import {
  getDailyReminderMessage,
  getIncompleteReminderMessage,
  getStreakReminderMessage,
  parseReminderTime,
  shouldScheduleDailyReminder,
  shouldScheduleIncompleteReminder,
  shouldScheduleStreakReminder,
  validateReminderTime,
} from "./notifications.ts";

test("validateReminderTime validates valid and invalid 24h formats", () => {
  assert.equal(validateReminderTime("09:00"), true);
  assert.equal(validateReminderTime("00:00"), true);
  assert.equal(validateReminderTime("23:59"), true);
  assert.equal(validateReminderTime("12:30"), true);

  assert.equal(validateReminderTime("24:00"), false);
  assert.equal(validateReminderTime("9:00"), false);
  assert.equal(validateReminderTime("09:60"), false);
  assert.equal(validateReminderTime(""), false);
  assert.equal(validateReminderTime("invalid"), false);
  // @ts-expect-error test non-string
  assert.equal(validateReminderTime(null), false);
});

test("parseReminderTime parses hour and minute correctly", () => {
  assert.deepEqual(parseReminderTime("09:30"), { hour: 9, minute: 30 });
  assert.deepEqual(parseReminderTime("20:45"), { hour: 20, minute: 45 });
  assert.deepEqual(parseReminderTime("00:00"), { hour: 0, minute: 0 });
  // Fallback on invalid
  assert.deepEqual(parseReminderTime("invalid"), { hour: 9, minute: 0 });
});

test("notification messages are calm, supportive, and non-judgmental", () => {
  const daily = getDailyReminderMessage();
  assert.ok(daily.title.includes("MYC"));
  assert.ok(!daily.body.toLowerCase().includes("danger"));
  assert.ok(!daily.body.toLowerCase().includes("lose"));

  const incomplete1 = getIncompleteReminderMessage(1);
  assert.ok(incomplete1.body.includes("1 commitment"));
  assert.ok(incomplete1.body.includes("progress still counts"));

  const incompleteMulti = getIncompleteReminderMessage(3);
  assert.ok(incompleteMulti.body.includes("3 commitments"));

  const streak = getStreakReminderMessage();
  assert.ok(!streak.body.toLowerCase().includes("broken"));
  assert.ok(!streak.body.toLowerCase().includes("risk"));
  assert.equal(streak.deepLinkUrl, "myc://dashboard");
});

test("shouldScheduleDailyReminder respects enabled flag and expected commitments", () => {
  assert.equal(
    shouldScheduleDailyReminder({ enabled: true, daily_reminder_enabled: true }, true),
    true,
  );
  // Disabled globally
  assert.equal(
    shouldScheduleDailyReminder({ enabled: false, daily_reminder_enabled: true }, true),
    false,
  );
  // Disabled individually
  assert.equal(
    shouldScheduleDailyReminder({ enabled: true, daily_reminder_enabled: false }, true),
    false,
  );
  // No commitments expected today (never notify on empty days)
  assert.equal(
    shouldScheduleDailyReminder({ enabled: true, daily_reminder_enabled: true }, false),
    false,
  );
});

test("shouldScheduleIncompleteReminder respects completion state", () => {
  // 1 of 2 completed: notify
  assert.equal(
    shouldScheduleIncompleteReminder({ enabled: true, incomplete_reminder_enabled: true }, 2, 1),
    true,
  );

  // 2 of 2 completed: do not notify
  assert.equal(
    shouldScheduleIncompleteReminder({ enabled: true, incomplete_reminder_enabled: true }, 2, 2),
    false,
  );

  // 0 expected: do not notify
  assert.equal(
    shouldScheduleIncompleteReminder({ enabled: true, incomplete_reminder_enabled: true }, 0, 0),
    false,
  );

  // Globally disabled
  assert.equal(
    shouldScheduleIncompleteReminder({ enabled: false, incomplete_reminder_enabled: true }, 3, 1),
    false,
  );
});

test("shouldScheduleStreakReminder respects streak reminder setting", () => {
  assert.equal(
    shouldScheduleStreakReminder({ enabled: true, streak_reminder_enabled: true }, 2, 1),
    true,
  );
  assert.equal(
    shouldScheduleStreakReminder({ enabled: true, streak_reminder_enabled: true }, 2, 2),
    false,
  );
  assert.equal(
    shouldScheduleStreakReminder({ enabled: true, streak_reminder_enabled: false }, 2, 1),
    false,
  );
});
