/**
 * planningScheduler.fixtures.js
 *
 * Reusable fixture tasks and expected split results for the planning scheduler
 * tests (Phase 5.3.3 — Better Session Splitting).
 *
 * Fixture coverage:
 * - exact multiples
 * - acceptable trailing remainders (regression)
 * - 5-minute remainder
 * - 10-minute remainder
 * - small remainders (1-11 minutes)
 * - single-session tasks
 * - very large tasks
 * - deterministic-output target
 */

'use strict';

const DEFAULT_SESSION_MINUTES = 25;

/**
 * Build a minimal task descriptor.
 *
 * @param {string} id               Task id.
 * @param {number} durationMinutes  Total task duration.
 * @param {object} [overrides]      Extra fields merged onto the task.
 * @returns {object} Task descriptor.
 */
function makeTask(id, durationMinutes, overrides = {}) {
  return {
    id,
    title: `Task ${id}`,
    durationMinutes,
    priority: 'medium',
    ...overrides,
  };
}

/** Fixture tasks used by the split tests. */
const tasks = {
  // --- Exact multiples -----------------------------------------------------
  exactMultiple50: makeTask('exact-50', 50),
  exactMultiple75: makeTask('exact-75', 75),
  exactMultiple100: makeTask('exact-100', 100),

  // --- Acceptable trailing remainders (must keep old behavior) -------------
  acceptableTrailing65: makeTask('trailing-65', 65),
  acceptableTrailing70: makeTask('trailing-70', 70),
  acceptableTrailing90: makeTask('trailing-90', 90),

  // --- 5-minute remainder --------------------------------------------------
  fiveMinuteRemainder55: makeTask('remainder-5-55', 55),
  fiveMinuteRemainder155: makeTask('remainder-5-155', 155),

  // --- 10-minute remainder -------------------------------------------------
  tenMinuteRemainder60: makeTask('remainder-10-60', 60),
  tenMinuteRemainder160: makeTask('remainder-10-160', 160),

  // --- Assorted small remainders (1-11 minutes) ----------------------------
  smallRemainder36: makeTask('remainder-11-36', 36),
  smallRemainder51: makeTask('remainder-1-51', 51),
  smallRemainder56: makeTask('remainder-6-56', 56),
  smallRemainder76: makeTask('remainder-1-76', 76),

  // --- Single-session tasks ------------------------------------------------
  singleSession20: makeTask('single-20', 20),
  singleSession25: makeTask('single-25', 25),

  // --- Very large tasks ----------------------------------------------------
  veryLarge10000: makeTask('very-large-10000', 10000),
  veryLarge10005: makeTask('very-large-10005', 10005),

  // --- Deterministic-output target -----------------------------------------
  deterministic55: makeTask('deterministic-55', 55),
};

/**
 * Expected session durations (minutes) per fixture task above, produced with
 * the default session size of 25 minutes and the default minimum trailing
 * session of 12 minutes (floor(25 * 0.5)).
 */
const expectedDurations = {
  exactMultiple50: [25, 25],
  exactMultiple75: [25, 25, 25],
  exactMultiple100: [25, 25, 25, 25],

  acceptableTrailing65: [25, 25, 15],
  acceptableTrailing70: [25, 25, 20],
  acceptableTrailing90: [25, 25, 25, 15],

  fiveMinuteRemainder55: [30, 25],
  fiveMinuteRemainder155: [30, 25, 25, 25, 25, 25],

  tenMinuteRemainder60: [35, 25],
  tenMinuteRemainder160: [35, 25, 25, 25, 25, 25],

  smallRemainder36: [36],
  smallRemainder51: [26, 25],
  smallRemainder56: [31, 25],
  smallRemainder76: [26, 25, 25],

  singleSession20: [20],
  singleSession25: [25],

  veryLarge10000: Array.from({ length: 400 }, () => 25),
  veryLarge10005: [30, ...Array.from({ length: 399 }, () => 25)],
};

module.exports = {
  DEFAULT_SESSION_MINUTES,
  makeTask,
  tasks,
  expectedDurations,
};
