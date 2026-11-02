import { describe, expect, it } from 'vitest';
import { keymap, type KeymapEntry } from '../data/keymap';
import { script } from '../test-utils/keyScript';
import { createSession, sampleTargets, TEST_LENGTH } from './session';

const pool = keymap.filter((e) => e.status !== 'unverified');

/** A random source that picks the named entries in order, then repeats the last one. */
function rigged(ids: string[]): () => number {
  let i = 0;
  return () => {
    const id = ids[Math.min(i++, ids.length - 1)];
    return (pool.findIndex((e) => e.id === id) + 0.5) / pool.length;
  };
}

function clock() {
  let t = 0;
  return { now: () => t, set: (v: number) => (t = v), add: (v: number) => (t += v) };
}

/** Play a script into a session, advancing the fake clock on waits. */
function play(steps: string[], targetIds: string[]) {
  const c = clock();
  const session = createSession({ random: rigged(targetIds), now: c.now });
  const results = [];
  for (const item of script(steps)) {
    if ('blur' in item) session.blur();
    else if ('wait' in item) c.add(item.wait);
    else results.push(session.handle(item));
  }
  return { session, results, state: session.state() };
}

const L = 'oligonKentimaBelow';
const SL = 'oligonKentimaMiddle';
const J = 'ison';
const K = 'oligon';
const N = 'apostrofos';
const SHIFT_R_K = 'oligonKentimataBelow';
const R_K = 'oligonKentimataAbove';
const SHIFT_K = 'petasti';
const CROSS = 'stavros';

describe('C1 to C22 end to end through tracker and session', () => {
  const cases: [string, string[], string[], { index: number; errors: number; attempts: number }][] = [
    ['C1', ['↓L'], [L], { index: 1, errors: 0, attempts: 1 }],
    ['C2', ['↓S', '↓L', '↑L', '↑S'], [SL], { index: 1, errors: 0, attempts: 1 }],
    ['C3', ['↓S', '↓L', '↑S', '↑L'], [SL], { index: 1, errors: 0, attempts: 1 }],
    ['C4', ['↓S', '↑S', '↓L'], [SL], { index: 0, errors: 1, attempts: 1 }],
    ['C5', ['↓L', '↓S'], [SL], { index: 0, errors: 1, attempts: 1 }],
    ['C6', ['↓S', '↓L'], [L], { index: 0, errors: 1, attempts: 1 }],
    ['C7', ['↓S', '↑S'], [L], { index: 0, errors: 0, attempts: 0 }],
    ['C8', ['↓S', '+5000', '↓L'], [SL], { index: 1, errors: 0, attempts: 1 }],
    ['C9', ['↓Shift', '↓R', '↓K'], [SHIFT_R_K], { index: 1, errors: 0, attempts: 1 }],
    ['C10', ['↓R', '↓Shift', '↓K'], [SHIFT_R_K], { index: 1, errors: 0, attempts: 1 }],
    ['C11', ['↓Shift', '↓R', '↓K'], [R_K], { index: 0, errors: 1, attempts: 1 }],
    ['C12', ['↓S', '↓D', '↓L'], [L], { index: 0, errors: 1, attempts: 1 }],
    ['C13', ['↓J', '↓J!', '↓J!', '↓J!'], [J, J], { index: 1, errors: 0, attempts: 1 }],
    ['C14', ['↓S', '↓L', '↑L', '↓L'], [SL, SL], { index: 2, errors: 0, attempts: 2 }],
    ['C15', ['↓S', '↓L', '↑L', '↓N'], [SL, N], { index: 1, errors: 1, attempts: 2 }],
    ['C16', ['↓J', '↓K', '↑J', '↑K'], [J, K], { index: 2, errors: 0, attempts: 2 }],
    ['C17', ['↓Meta', '↓J'], [J], { index: 0, errors: 0, attempts: 0 }],
    ['C18', ['↓H'], [J], { index: 0, errors: 1, attempts: 1 }],
    ['C19', ['↓Space', '↓Tab'], [J], { index: 0, errors: 0, attempts: 0 }],
    ['C20', ['↓S', 'blur', '↓L'], [L], { index: 1, errors: 0, attempts: 1 }],
    ['C21', ['↓ShiftLeft', '↓ShiftRight', '↑ShiftLeft', '↓K'], [SHIFT_K], { index: 1, errors: 0, attempts: 1 }],
    ['C22', ['↓Shift', '↓='], [CROSS], { index: 1, errors: 0, attempts: 1 }],
  ];

  it.each(cases)('%s', (_id, steps, targets, expected) => {
    const { state } = play(steps, targets);
    expect({ index: state.index, errors: state.errors, attempts: state.attempts }).toEqual(expected);
  });

  it('C7: a modifier alone does not start the clock', () => {
    expect(play(['↓S', '↑S'], [L]).state.startedAt).toBeNull();
  });

  it('C17: Meta+J is ignored and not prevented', () => {
    expect(play(['↓Meta', '↓J'], [J]).results.map((r) => r.preventDefault)).toEqual([false, false]);
  });
});

describe('R15 restart', () => {
  it('clears the session but not the held keys', () => {
    const session = createSession({ random: rigged([SL]), now: () => 7 });
    session.handle({ type: 'down', code: 'KeyS' });
    session.handle({ type: 'down', code: 'KeyH' });
    expect(session.state().errors).toBe(1);

    session.restart();
    const s = session.state();
    expect([s.index, s.errors, s.attempts, s.startedAt, s.endedAt]).toEqual([0, 0, 0, null, null]);

    // S is still physically down, so this L is S+L and answers the SL target.
    session.handle({ type: 'down', code: 'KeyL' });
    expect(session.state()).toMatchObject({ index: 1, errors: 0, attempts: 1 });
  });

  it('draws a new test', () => {
    let n = 0;
    const session = createSession({ random: () => (n++ % 61) / 61, now: () => 0 });
    const first = session.state().targets.map((t) => t.id);
    session.restart();
    const second = session.state().targets.map((t) => t.id);
    expect(second).toHaveLength(TEST_LENGTH);
    expect(second).not.toEqual(first);
  });
});

describe('criterion 3: sampling', () => {
  it('draws 20 neumes with replacement', () => {
    const t = sampleTargets(() => 0, pool);
    expect(t).toHaveLength(20);
    expect(new Set(t.map((e) => e.id)).size).toBe(1);
  });

  it('maps the random range uniformly onto the pool, ends included', () => {
    expect(sampleTargets(() => 0, pool)[0]).toBe(pool[0]);
    expect(sampleTargets(() => 0.999999, pool)[0]).toBe(pool[pool.length - 1]);
  });

  it('never includes an unverified entry', () => {
    const entries: KeymapEntry[] = [
      { ...keymap[0], id: 'bad', status: 'unverified' },
      ...keymap.slice(0, 5),
    ];
    for (let k = 0; k < 200; k++) {
      const draws = sampleTargets(() => k / 200, entries);
      expect(draws.some((e) => e.status === 'unverified')).toBe(false);
    }
  });
});

describe('criterion 4: scoring', () => {
  function fullRun(errors: number) {
    const c = clock();
    const session = createSession({ random: () => 0, now: c.now }); // all targets are J
    c.set(1000);
    for (let i = 0; i < errors; i++) session.handle({ type: 'down', code: 'KeyH' });
    for (let i = 0; i < 20; i++) {
      c.set(i === 19 ? 41000 : 1000 + i * 1000);
      session.handle({ type: 'down', code: 'KeyJ' });
      session.handle({ type: 'up', code: 'KeyJ' });
    }
    return session;
  }

  it('matches the SPEC example: 40000 ms, 5 errors gives 40.00 s, 30.0/min, 80.0%', () => {
    const state = fullRun(5).state();
    expect(state.results).toEqual({ totalSeconds: 40, neumesPerMinute: 30, accuracyPercent: 80 });
    expect(state.attempts).toBe(25);
  });

  it('rounds seconds to 2 decimals, rate and accuracy to 1', () => {
    const c = clock();
    const session = createSession({ random: () => 0, now: c.now });
    c.set(0);
    session.handle({ type: 'down', code: 'KeyH' });
    for (let i = 0; i < 20; i++) {
      c.set(i === 19 ? 33333 : 100);
      session.handle({ type: 'down', code: 'KeyJ' });
      session.handle({ type: 'up', code: 'KeyJ' });
    }
    // 20 / (33.333 / 60) = 36.0004 per minute; 20/21 = 95.238%.
    expect(session.state().results).toEqual({ totalSeconds: 33.33, neumesPerMinute: 36, accuracyPercent: 95.2 });
  });

  it('starts the clock at the first attempt, right or wrong', () => {
    const c = clock();
    const session = createSession({ random: () => 0, now: c.now });
    c.set(300);
    session.handle({ type: 'down', code: 'KeyH' });
    expect(session.state().startedAt).toBe(300);
  });

  it('does not start the clock on a modifier press', () => {
    const c = clock();
    const session = createSession({ random: () => 0, now: c.now });
    c.set(500);
    session.handle({ type: 'down', code: 'KeyS' });
    expect(session.state().startedAt).toBeNull();
    c.set(2000);
    session.handle({ type: 'down', code: 'KeyJ' });
    expect(session.state().startedAt).toBe(2000);
  });

  it('stops the clock at neume 20 and ignores later attempts', () => {
    const session = fullRun(0);
    const done = session.state();
    expect(done.done).toBe(true);
    expect(done.endedAt).toBe(41000);
    expect(done.results?.accuracyPercent).toBe(100);
    session.handle({ type: 'down', code: 'KeyH' });
    session.handle({ type: 'down', code: 'KeyJ' });
    expect(session.state()).toEqual(done);
  });

  it('has no results before the test is done', () => {
    expect(createSession({ random: () => 0, now: () => 0 }).state().results).toBeNull();
  });
});
