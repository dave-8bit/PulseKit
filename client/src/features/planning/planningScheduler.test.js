/**
 * planningScheduler.test.js
 *
 * Phase 5.3.3 — Better Session Splitting.
 *
 * Covers:
 * - exact multiples
 * - small remainders
 * - 5-minute remainder
 * - 10-minute remainder
 * - very large tasks
 * - deterministic output
 * - duration preservation
 * - block ordering / block id format
 * - regression: priority scheduling (5.3.1), daily load balancing (5.3.2),
 *   and roadmap generation
 *
 * Run with: node --test client/src/features/planning/planningScheduler.test.js
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const scheduler = require('./planningScheduler.js');
const {
  DEFAULT_SESSION_MINUTES,
  splitTaskIntoSessions,
  sortTasksByPriority,
  loadBalanceSessions,
  buildRoadmap,
} = scheduler;

const {
  DEFAULT_SESSION_MINUTES: FIXTURE_DEFAULT_SESSION_MINUTES,
  tasks,
  expectedDurations,
} = require('./planningScheduler.fixtures.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the durations of a list of sessions. */
function durations(sessions) {
  return sessions.map((session) => session.durationMinutes);
}

/** Sum the durations of a list of sessions. */
function totalMinutes(sessions) {
  return sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
}

// ---------------------------------------------------------------------------
// Exact multiples
// ---------------------------------------------------------------------------

test('splits exact multiples into equal full-size sessions', () => {
  for (const key of ['exactMultiple50', 'exactMultiple75', 'exactMultiple100']) {
    const task = tasks[key];
    const sessions = splitTaskIntoSessions(task);
    assert.deepEqual(
      durations(sessions),
      expectedDurations[key],
      `${key} should split into ${expectedDurations[key].join(' + ')}`
    );
    for (const session of sessions) {
      assert.equal(session.durationMinutes, DEFAULT_SESSION_MINUTES);
    }
  }
});

test('an exact multiple of 25 produces no trailing remainder', () => {
  const sessions = splitTaskIntoSessions(tasks.exactMultiple75);
  assert.equal(sessions.length, 3);
  assert.equal(durations(sessions).at(-1), 25);
});

// ---------------------------------------------------------------------------
// Acceptable trailing remainders (regression)
// ---------------------------------------------------------------------------

test('keeps an acceptable trailing remainder untouched (70 -> 25+25+20)', () => {
  const sessions = splitTaskIntoSessions(tasks.acceptableTrailing70);
  assert.deepEqual(durations(sessions), [25, 25, 20]);
  assert.equal(totalMinutes(sessions), 70);
});

test('keeps acceptable trailing remainders for other sizes', () => {
  for (const key of ['acceptableTrailing65', 'acceptableTrailing90']) {
    const sessions = splitTaskIntoSessions(tasks[key]);
    assert.deepEqual(durations(sessions), expectedDurations[key]);
    assert.equal(totalMinutes(sessions), tasks[key].durationMinutes);
  }
});

// ---------------------------------------------------------------------------
// 5-minute remainder
// ---------------------------------------------------------------------------

test('folds a 5-minute remainder into the first session (55 -> 30+25)', () => {
  const sessions = splitTaskIntoSessions(tasks.fiveMinuteRemainder55);
  assert.deepEqual(durations(sessions), [30, 25]);
  assert.equal(sessions.length, 2);
  // Never emit a tiny 5-minute trailing stub.
  assert.ok(durations(sessions).every((d) => d >= 12));
  assert.equal(totalMinutes(sessions), 55);
});

test('folds a 5-minute remainder into the first session of a large task', () => {
  const sessions = splitTaskIntoSessions(tasks.fiveMinuteRemainder155);
  assert.deepEqual(durations(sessions), expectedDurations.fiveMinuteRemainder155);
  assert.equal(sessions.length, 6);
  assert.equal(totalMinutes(sessions), 155);
});

// ---------------------------------------------------------------------------
// 10-minute remainder
// ---------------------------------------------------------------------------

test('folds a 10-minute remainder into the first session (60 -> 35+25)', () => {
  const sessions = splitTaskIntoSessions(tasks.tenMinuteRemainder60);
  assert.deepEqual(durations(sessions), [35, 25]);
  assert.ok(durations(sessions).every((d) => d >= 12));
  assert.equal(totalMinutes(sessions), 60);
});

test('folds a 10-minute remainder into the first session of a large task', () => {
  const sessions = splitTaskIntoSessions(tasks.tenMinuteRemainder160);
  assert.deepEqual(durations(sessions), expectedDurations.tenMinuteRemainder160);
  assert.equal(sessions.length, 6);
  assert.equal(totalMinutes(sessions), 160);
});
// ---------------------------------------------------------------------------
// Small remainders
// ---------------------------------------------------------------------------

test('folds small remainders (1-11 minutes) into the first session', () => {
  for (const key of ['smallRemainder36', 'smallRemainder51', 'smallRemainder56', 'smallRemainder76']) {
    const task = tasks[key];
    const sessions = splitTaskIntoSessions(task);
    assert.deepEqual(
      durations(sessions),
      expectedDurations[key],
      `${key} should split into ${expectedDurations[key].join(' + ')}`
    );
    assert.ok(durations(sessions).every((d) => d > 0));
    assert.equal(totalMinutes(sessions), task.durationMinutes);
  }
});

test('no session is ever shorter than the minimum trailing size when avoidable', () => {
  const minTrailing = Math.floor(DEFAULT_SESSION_MINUTES * scheduler.MIN_TRAILING_SESSION_FRACTION);
  for (const key of Object.keys(expectedDurations)) {
    const sessions = splitTaskIntoSessions(tasks[key]);
    for (const d of durations(sessions)) {
      if (d < minTrailing) {
        // The only allowed sub-threshold sessions are single-session tasks
        // whose whole duration is too short to split further.
        assert.equal(tasks[key].durationMinutes, d);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Single-session tasks
// ---------------------------------------------------------------------------

test('tasks that fit in one session are not split', () => {
  for (const key of ['singleSession20', 'singleSession25']) {
    const sessions = splitTaskIntoSessions(tasks[key]);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].durationMinutes, tasks[key].durationMinutes);
    assert.equal(sessions[0].startMinutes, 0);
  }
});

// ---------------------------------------------------------------------------
// Very large tasks
// ---------------------------------------------------------------------------

test('splits a very large task (10000 minutes) into 400 full sessions', () => {
  const sessions = splitTaskIntoSessions(tasks.veryLarge10000);
  assert.equal(sessions.length, 400);
  for (const session of sessions) {
    assert.equal(session.durationMinutes, 25);
  }
  assert.equal(totalMinutes(sessions), 10000);
});

test('splits a very large task with a tiny remainder (10005 minutes)', () => {
  const sessions = splitTaskIntoSessions(tasks.veryLarge10005);
  assert.equal(sessions.length, 400);
  assert.equal(sessions[0].durationMinutes, 30);
  assert.ok(sessions.slice(1).every((session) => session.durationMinutes === 25));
  assert.equal(totalMinutes(sessions), 10005);
});

// ---------------------------------------------------------------------------
// Deterministic output
// ---------------------------------------------------------------------------

test('produces identical output for identical inputs', () => {
  const first = splitTaskIntoSessions(tasks.deterministic55);
  const second = splitTaskIntoSessions(tasks.deterministic55);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
});

test('produces identical output across repeated runs for many durations', () => {
  for (let duration = 1; duration <= 500; duration += 1) {
    const task = { id: `deterministic-${duration}`, durationMinutes: duration };
    const first = splitTaskIntoSessions(task);
    const second = splitTaskIntoSessions(task);
    assert.deepEqual(second, first);
    assert.equal(JSON.stringify(second), JSON.stringify(first));
  }
});

// ---------------------------------------------------------------------------
// Duration preservation
// ---------------------------------------------------------------------------

test('preserves the total duration exactly for every input 1..300', () => {
  for (let duration = 1; duration <= 300; duration += 1) {
    const task = { id: `preserve-${duration}`, durationMinutes: duration };
    const sessions = splitTaskIntoSessions(task);
    assert.equal(
      totalMinutes(sessions),
      duration,
      `sum must equal ${duration} for task ${task.id}`
    );
  }
});

test('preserves the total duration for large and oversized inputs', () => {
  for (const duration of [501, 999, 1000, 10000, 10005, 12345, 100000]) {
    const task = { id: `preserve-large-${duration}`, durationMinutes: duration };
    assert.equal(totalMinutes(splitTaskIntoSessions(task)), duration);
  }
});

test('never creates zero or negative duration blocks', () => {
  for (let duration = 1; duration <= 300; duration += 1) {
    const task = { id: `positive-${duration}`, durationMinutes: duration };
    for (const session of splitTaskIntoSessions(task)) {
      assert.ok(session.durationMinutes > 0, `block must be positive for ${duration}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Ordering & block id format
// ---------------------------------------------------------------------------

test('preserves session order and cumulative start times', () => {
  const sessions = splitTaskIntoSessions(tasks.acceptableTrailing70);
  assert.equal(sessions.length, 3);
  sessions.forEach((session, i) => {
    assert.equal(session.index, i);
    assert.equal(session.taskId, tasks.acceptableTrailing70.id);
    const expectedStart = durations(sessions)
      .slice(0, i)
      .reduce((sum, d) => sum + d, 0);
    assert.equal(session.startMinutes, expectedStart);
  });
});

test('preserves the block id format `session-<taskId>-<n>`', () => {
  const sessions = splitTaskIntoSessions(tasks.fiveMinuteRemainder55);
  assert.deepEqual(
    sessions.map((session) => session.id),
    ['session-remainder-5-55-1', 'session-remainder-5-55-2']
  );
});

test('block ids stay sequential for very large tasks', () => {
  const sessions = splitTaskIntoSessions(tasks.veryLarge10000);
  assert.equal(sessions[0].id, 'session-very-large-10000-1');
  assert.equal(sessions[399].id, 'session-very-large-10000-400');
  assert.equal(new Set(sessions.map((s) => s.id)).size, 400);
});

// ---------------------------------------------------------------------------
// Edge inputs
// ---------------------------------------------------------------------------

test('returns no sessions for zero, negative, or missing durations', () => {
  assert.deepEqual(splitTaskIntoSessions({ id: 'zero', durationMinutes: 0 }), []);
  assert.deepEqual(splitTaskIntoSessions({ id: 'neg', durationMinutes: -25 }), []);
  assert.deepEqual(splitTaskIntoSessions({ id: 'nan', durationMinutes: NaN }), []);
  assert.deepEqual(splitTaskIntoSessions({ id: 'missing' }), []);
});

test('rejects non-positive session options', () => {
  assert.throws(
    () => splitTaskIntoSessions({ id: 'a', durationMinutes: 100 }, { sessionMinutes: 0 }),
    TypeError
  );
  assert.throws(
    () => splitTaskIntoSessions({ id: 'a', durationMinutes: 100 }, { minTrailingMinutes: -1 }),
    TypeError
  );
});

// ---------------------------------------------------------------------------
// Custom options
// ---------------------------------------------------------------------------

test('honors a custom session size (45 minutes)', () => {
  const task = { id: 'custom-45', durationMinutes: 100 };
  // 100 = 2 full 45m sessions with a 10m remainder -> folded into 55 + 45.
  assert.deepEqual(durations(splitTaskIntoSessions(task, { sessionMinutes: 45 })), [55, 45]);
});

test('honors a custom minimum trailing size', () => {
  const task = { id: 'custom-trailing', durationMinutes: 55 };
  // With a 5-minute minimum, a 5-minute remainder is acceptable as-is.
  assert.deepEqual(
    durations(splitTaskIntoSessions(task, { sessionMinutes: 25, minTrailingMinutes: 5 })),
    [25, 25, 5]
  );
  // With the default 12-minute minimum it is folded instead.
  assert.deepEqual(
    durations(splitTaskIntoSessions(task, { sessionMinutes: 25, minTrailingMinutes: 12 })),
    [30, 25]
  );
});

// ---------------------------------------------------------------------------
// Regression — priority scheduling (5.3.1)
// ---------------------------------------------------------------------------

test('sorts overdue tasks first, then high over low priority', () => {
  const now = Date.parse('2026-08-19T12:00:00Z');
  const tasks5_3_1 = [
    { id: 'low', title: 'Low', priority: 'low', dueDate: '2026-08-25', createdAt: '2026-08-01' },
    { id: 'high', title: 'High', priority: 'high', dueDate: '2026-08-22', createdAt: '2026-08-02' },
    { id: 'overdue', title: 'Overdue', priority: 'low', dueDate: '2026-08-10', createdAt: '2026-08-03' },
    { id: 'high-tie', title: 'High tie', priority: 'high', dueDate: '2026-08-22', createdAt: '2026-08-01' },
  ];
  const sorted = sortTasksByPriority(tasks5_3_1, now);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['overdue', 'high-tie', 'high', 'low']
  );
});

// ---------------------------------------------------------------------------
// Regression — daily load balancing (5.3.2)
// ---------------------------------------------------------------------------

test('load balancing never exceeds the daily capacity', () => {
  const now = Date.parse('2026-08-19T12:00:00Z');
  const tasks5_3_2 = [
    { id: 't1', durationMinutes: 30, priority: 'high' },
    { id: 't2', durationMinutes: 30, priority: 'medium' },
    { id: 't3', durationMinutes: 30, priority: 'low' },
  ];
  const days = loadBalanceSessions(tasks5_3_2, {
    dailyCapacityMinutes: 50,
    startDate: '2026-08-19',
    now,
  });

  for (const day of days) {
    assert.ok(day.remainingMinutes >= 0, `day ${day.date} exceeded capacity`);
    assert.ok(day.remainingMinutes <= day.capacityMinutes);
  }
  // A 30m session cannot share a 50m day with another 30m session.
  assert.equal(days.length, 3);
  for (const day of days) {
    assert.equal(day.sessions.length, 1);
  }
});

test('load balancing splits tasks with the improved splitter', () => {
  const now = Date.parse('2026-08-19T12:00:00Z');
  const days = loadBalanceSessions([{ id: 'big', durationMinutes: 55, priority: 'high' }], {
    dailyCapacityMinutes: 60,
    startDate: '2026-08-19',
    now,
  });

  // 55m -> 30 + 25, both fit in a single 60m day.
  assert.equal(days.length, 1);
  assert.deepEqual(durations(days[0].sessions), [30, 25]);
  assert.equal(days[0].remainingMinutes, 5);
});

// ---------------------------------------------------------------------------
// Regression — roadmap generation
// ---------------------------------------------------------------------------

test('builds a roadmap summary from a balanced schedule', () => {
  const now = Date.parse('2026-08-19T12:00:00Z');
  const days = loadBalanceSessions(
    [
      { id: 'alpha', durationMinutes: 40, priority: 'high' },
      { id: 'beta', durationMinutes: 30, priority: 'low' },
    ],
    { dailyCapacityMinutes: 50, startDate: '2026-08-19', now }
  );
  const roadmap = buildRoadmap(days);

  assert.equal(roadmap.length, 2);
  assert.deepEqual(
    roadmap.map((entry) => entry.date),
    ['2026-08-19', '2026-08-20']
  );
  assert.equal(roadmap[0].totalMinutes, 40);
  assert.equal(roadmap[1].totalMinutes, 30);
  assert.deepEqual(roadmap[0].taskIds, ['alpha']);
  assert.deepEqual(roadmap[1].taskIds, ['beta']);
});

// ---------------------------------------------------------------------------
// Fixture sanity
// ---------------------------------------------------------------------------

test('fixtures are internally consistent with the default session size', () => {
  assert.equal(FIXTURE_DEFAULT_SESSION_MINUTES, DEFAULT_SESSION_MINUTES);
  for (const [key, expected] of Object.entries(expectedDurations)) {
    assert.equal(
      expected.reduce((sum, d) => sum + d, 0),
      tasks[key].durationMinutes,
      `fixture ${key} durations must sum to the task duration`
    );
  }
});
