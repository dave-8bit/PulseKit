/**
 * planningScheduler.js
 *
 * Deterministic planning engine for the PulseKit planner.
 *
 * - Phase 5.3.1 — Priority Scheduling
 * - Phase 5.3.2 — Daily Load Balancing
 * - Phase 5.3.3 — Better Session Splitting
 *
 * Every function in this module is pure and deterministic: the same inputs
 * always produce the same output, and no global/random state is read or
 * written.
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default length of a single focus session, in minutes. */
const DEFAULT_SESSION_MINUTES = 25;

/**
 * Minimum share of a full session that a trailing remainder must keep in
 * order to be left alone. Remainders below this threshold are merged into an
 * earlier session so schedules never end in a tiny (5-10 minute) stub.
 */
const MIN_TRAILING_SESSION_FRACTION = 0.5;

/** Default focused-work capacity of a single day, in minutes. */
const DEFAULT_DAILY_CAPACITY_MINUTES = 300;

/** Priority weights used by the priority scheduler (Phase 5.3.1). */
const PRIORITY_WEIGHTS = {
  high: 1000,
  medium: 500,
  low: 0,
};

const HOUR_MS = 60 * 60 * 1000;
const WEEK_HOURS = 7 * 24;

// ---------------------------------------------------------------------------
// Small internal helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a value into a positive integer number of minutes.
 * Throws when the value is missing, non-finite, or not positive.
 */
function toPositiveInteger(value, label) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new TypeError(`${label} must be a positive number of minutes`);
  }
  return Math.round(minutes);
}

/** Return an array with `count` copies of `value`. */
function repeat(value, count) {
  return Array.from({ length: count }, () => value);
}

/**
 * Build a single focus-session descriptor.
 *
 * The `id` format is the canonical block format and must be preserved:
 * `session-${taskId}-${index + 1}`.
 */
function buildSession(taskId, index, durationMinutes, startMinutes) {
  return {
    id: `session-${taskId}-${index + 1}`,
    taskId,
    index,
    startMinutes,
    durationMinutes,
  };
}

// ---------------------------------------------------------------------------
// Phase 5.3.3 — Better session splitting
// ---------------------------------------------------------------------------

/**
 * Split a task into focus sessions.
 *
 * Previous behavior used fixed-size blocks and left a possibly very small
 * trailing block (for example: 55m -> 25m + 25m + 5m). This version keeps a
 * trailing block only when it is large enough to be useful; a tiny remainder
 * is folded into the first block instead (for example: 55m -> 30m + 25m).
 *
 * Guarantees:
 * - Total duration is preserved exactly.
 * - No zero/negative-duration sessions are produced.
 * - Session order is preserved (earlier sessions come first).
 * - Generation is deterministic (same inputs -> same output).
 * - The `id` block format is preserved for every session.
 *
 * @param {object} task                  Task descriptor: { id, durationMinutes, ... }.
 * @param {object} [options]
 * @param {number} [options.sessionMinutes]       Full session size (default 25).
 * @param {number} [options.minTrailingMinutes]   Minimum standalone trailing size
 *                                                (default half a session).
 * @returns {Array<object>} Focus sessions, in start order.
 */
function splitTaskIntoSessions(task, options = {}) {
  const taskId = task.id;
  const duration = Number(task.durationMinutes ?? task.duration);

  // A task with no positive duration produces no sessions, never a
  // zero/negative block.
  if (!Number.isFinite(duration) || duration <= 0) {
    return [];
  }

  const sessionMinutes = toPositiveInteger(
    options.sessionMinutes ?? DEFAULT_SESSION_MINUTES,
    'sessionMinutes'
  );
  const minTrailingMinutes = toPositiveInteger(
    options.minTrailingMinutes ?? Math.floor(sessionMinutes * MIN_TRAILING_SESSION_FRACTION),
    'minTrailingMinutes'
  );

  // The whole task fits in a single session.
  if (duration <= sessionMinutes) {
    return [buildSession(taskId, 0, duration, 0)];
  }

  const fullSessions = Math.floor(duration / sessionMinutes);
  const remainder = duration % sessionMinutes;

  let durations;
  if (remainder === 0) {
    // Exact multiple: nothing left over.
    durations = repeat(sessionMinutes, fullSessions);
  } else if (remainder >= minTrailingMinutes) {
    // Acceptable trailing remainder (e.g. 70m -> 25m + 25m + 20m).
    durations = [...repeat(sessionMinutes, fullSessions), remainder];
  } else {
    // Tiny trailing remainder (e.g. 55m -> 25m + 25m + 5m): fold it into the
    // first session instead of emitting a 5-10 minute stub at the end.
    durations = repeat(sessionMinutes, fullSessions);
    durations[0] += remainder;
  }

  let start = 0;
  return durations.map((durationMinutes, index) => {
    const session = buildSession(taskId, index, durationMinutes, start);
    start += durationMinutes;
    return session;
  });
}

// ---------------------------------------------------------------------------
// Phase 5.3.1 — Priority scheduling
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic priority score for a task.
 *
 * Higher scores rank first:
 * - overdue tasks always outrank everything else;
 * - explicit priority (high > medium > low) dominates;
 * - among equal scores the task due soonest wins;
 * - remaining ties fall back to earliest createdAt.
 *
 * @param {object} task  Task descriptor.
 * @param {number} [now] Epoch ms used as "today".
 * @returns {number} Priority score.
 */
function computePriorityScore(task, now = Date.now()) {
  const dueMs = task.dueDate ? new Date(task.dueDate).getTime() : Number.POSITIVE_INFINITY;

  if (Number.isFinite(dueMs) && dueMs < now) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hoursUntilDue = Number.isFinite(dueMs) ? (dueMs - now) / HOUR_MS : Number.POSITIVE_INFINITY;
  const urgency = Number.isFinite(hoursUntilDue) ? Math.max(0, 1 - hoursUntilDue / WEEK_HOURS) : 0;
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] ?? PRIORITY_WEIGHTS.medium;

  return priorityWeight + urgency;
}

/**
 * Order tasks by priority, highest first, without mutating the input.
 * Ties are broken deterministically by createdAt.
 *
 * @param {Array<object>} tasks
 * @param {number} [now]
 * @returns {Array<object>} New array sorted by priority.
 */
function sortTasksByPriority(tasks, now = Date.now()) {
  return [...tasks].sort((a, b) => {
    const byScore = computePriorityScore(b, now) - computePriorityScore(a, now);
    if (byScore !== 0) {
      return byScore;
    }
    return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
  });
}

// ---------------------------------------------------------------------------
// Phase 5.3.2 — Daily load balancing
// ---------------------------------------------------------------------------

/**
 * Create an empty day bucket with the given focused-work capacity.
 *
 * @param {string} dateKey          YYYY-MM-DD.
 * @param {number} capacityMinutes
 * @returns {object} Day bucket.
 */
function createDay(dateKey, capacityMinutes) {
  return {
    date: dateKey,
    capacityMinutes,
    remainingMinutes: capacityMinutes,
    sessions: [],
  };
}

/**
 * Pack tasks into days without exceeding the daily capacity.
 *
 * Tasks are processed in priority order (Phase 5.3.1) and each one is split
 * into focus sessions (Phase 5.3.3). Every session is placed into the
 * earliest day with enough remaining capacity; a new day opens when the
 * current day cannot fit it. Fully deterministic: `startDate` and `now`
 * default to today but can be injected for reproducible schedules.
 *
 * @param {Array<object>} tasks
 * @param {object} [options]
 * @param {number} [options.dailyCapacityMinutes]
 * @param {string} [options.startDate]  YYYY-MM-DD for the first day.
 * @param {number} [options.now]        Epoch ms used as "today".
 * @returns {Array<object>} Day buckets in chronological order.
 */
function loadBalanceSessions(tasks, options = {}) {
  const capacity = toPositiveInteger(
    options.dailyCapacityMinutes ?? DEFAULT_DAILY_CAPACITY_MINUTES,
    'dailyCapacityMinutes'
  );
  const startDate = options.startDate ?? todayKey(options.now ?? Date.now());
  const now = options.now ?? Date.now();
  const orderedTasks = sortTasksByPriority(tasks, now);

  const days = [createDay(startDate, capacity)];

  for (const task of orderedTasks) {
    for (const session of splitTaskIntoSessions(task, options)) {
      let day = days.find((d) => d.remainingMinutes >= session.durationMinutes);
      if (!day) {
        day = createDay(addDaysKey(startDate, days.length), capacity);
        days.push(day);
      }
      day.sessions.push(session);
      day.remainingMinutes -= session.durationMinutes;
    }
  }

  return days;
}

// ---------------------------------------------------------------------------
// Roadmap generation
// ---------------------------------------------------------------------------

/**
 * Summarize a balanced schedule into a compact roadmap.
 *
 * @param {Array<object>} days  Output of loadBalanceSessions().
 * @returns {Array<object>} Roadmap entries, one per day.
 */
function buildRoadmap(days) {
  return days.map((day) => ({
    date: day.date,
    totalMinutes: day.capacityMinutes - day.remainingMinutes,
    sessionCount: day.sessions.length,
    taskIds: [...new Set(day.sessions.map((session) => session.taskId))],
  }));
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Local YYYY-MM-DD key for a Date. */
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local YYYY-MM-DD key for an epoch-ms timestamp. */
function todayKey(now) {
  return toDateKey(new Date(now));
}

/** Shift a YYYY-MM-DD key by a whole number of days. */
function addDaysKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return toDateKey(new Date(year, month - 1, day + days));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  DEFAULT_SESSION_MINUTES,
  MIN_TRAILING_SESSION_FRACTION,
  DEFAULT_DAILY_CAPACITY_MINUTES,
  PRIORITY_WEIGHTS,

  // Phase 5.3.3 — Better session splitting
  splitTaskIntoSessions,

  // Phase 5.3.1 — Priority scheduling
  computePriorityScore,
  sortTasksByPriority,

  // Phase 5.3.2 — Daily load balancing
  createDay,
  loadBalanceSessions,

  // Roadmap generation
  buildRoadmap,

  // Date helpers (exported so tests can stay deterministic)
  toDateKey,
  todayKey,
  addDaysKey,
};

