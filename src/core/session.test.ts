import { describe, expect, it } from 'vitest';
import { keymap, type KeymapEntry } from '../data/keymap';
import { script } from '../test-utils/keyScript';
import { drawPool, neumeChances } from './weights';
import { seededRandom } from './random';
import { drillPool, drills } from './drills';
import { assertNoRepeatsPossible, createSession, LENGTH_OPTIONS, sampleTargets, TEST_LENGTH } from './session';

const pool = drawPool(keymap.filter((e) => e.table === 'quantity'));
const chances = neumeChances(pool);

/**
 * A random source that picks the named entries in order, then repeats the last one. The draw is
 * weighted, so each value is the middle of the named entry's slice of [0, 1).
 */
function rigged(ids: string[]): () => number {
  let i = 0;
  return () => {
    const id = ids[Math.min(i++, ids.length - 1)];
    const at = pool.findIndex((e) => e.id === id);
    const before = chances.slice(0, at).reduce((a, b) => a + b, 0);
    return before + chances[at] / 2;
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
    const session = createSession({ random: () => (n++ % pool.length) / pool.length, now: () => 0 });
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

  it('maps the random range onto the pool in keymap order, ends included', () => {
    expect(sampleTargets(() => 0, pool)[0]).toBe(pool[0]);
    expect(sampleTargets(() => 0.999999, pool)[0]).toBe(pool[pool.length - 1]);
  });

  it('throws on an empty pool', () => {
    expect(() => sampleTargets(() => 0, [{ ...keymap[0], status: 'unverified' }])).toThrow(
      'drawPool: no verified entries',
    );
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
    for (let i = 0; i < TEST_LENGTH; i++) {
      c.set(i === TEST_LENGTH - 1 ? 41000 : 1000 + i * 1000);
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
    for (let i = 0; i < TEST_LENGTH; i++) {
      c.set(i === TEST_LENGTH - 1 ? 33333 : 100);
      session.handle({ type: 'down', code: 'KeyJ' });
      session.handle({ type: 'up', code: 'KeyJ' });
    }
    // 20 / (33.333 / 60) = 36.0004 per minute; 20/21 = 95.238%.
    expect(session.state().results).toEqual({ totalSeconds: 33.33, neumesPerMinute: 36, accuracyPercent: 95.2 });
  });

  it('rounds the rate to 1 decimal, down and up', () => {
    const rate = (ms: number) => {
      const c = clock();
      const session = createSession({ random: () => 0, now: c.now });
      c.set(0);
      session.handle({ type: 'down', code: 'KeyJ' });
      session.handle({ type: 'up', code: 'KeyJ' });
      for (let i = 1; i < TEST_LENGTH; i++) {
        c.set(i === TEST_LENGTH - 1 ? ms : 1);
        session.handle({ type: 'down', code: 'KeyJ' });
        session.handle({ type: 'up', code: 'KeyJ' });
      }
      return session.state().results?.neumesPerMinute;
    };
    expect(rate(37000)).toBe(32.4); // 32.432...
    expect(rate(41000)).toBe(29.3); // 29.268...
  });

  it('gives a null rate, not Infinity or NaN, when the run took zero time', () => {
    const session = createSession({ random: () => 0, now: () => 5 }); // frozen clock
    for (let i = 0; i < TEST_LENGTH; i++) {
      session.handle({ type: 'down', code: 'KeyJ' });
      session.handle({ type: 'up', code: 'KeyJ' });
    }
    expect(session.state().results).toEqual({ totalSeconds: 0, neumesPerMinute: null, accuracyPercent: 100 });
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

describe('D1 hint', () => {
  const wrong = { type: 'down', code: 'KeyH' } as const;

  it('is off at the start, on after a wrong attempt, off after a correct one', () => {
    const session = createSession({ random: rigged([J, K]), now: () => 0 });
    expect(session.state().lastAttemptWrong).toBe(false);
    session.handle(wrong);
    session.handle({ type: 'up', code: 'KeyH' });
    expect(session.state().lastAttemptWrong).toBe(true);
    session.handle({ type: 'down', code: 'KeyJ' });
    expect(session.state()).toMatchObject({ index: 1, lastAttemptWrong: false });
  });

  it('stays on through further wrong attempts and modifier-only presses', () => {
    const session = createSession({ random: rigged([J]), now: () => 0 });
    session.handle(wrong);
    session.handle({ type: 'down', code: 'KeyS' });
    session.handle({ type: 'down', code: 'KeyH' });
    expect(session.state().lastAttemptWrong).toBe(true);
  });

  it('is cleared by restart', () => {
    const session = createSession({ random: rigged([J]), now: () => 0 });
    session.handle(wrong);
    session.restart();
    expect(session.state().lastAttemptWrong).toBe(false);
  });
});

describe('test length comes from the targets', () => {
  const press = (session: ReturnType<typeof createSession>, code: string) => {
    session.handle({ type: 'down', code });
    session.handle({ type: 'up', code });
  };
  const run = (length: number, errors: number) => {
    const c = clock();
    const session = createSession({ random: () => 0, now: c.now, length }); // all targets are J
    for (let i = 0; i < errors; i++) press(session, 'KeyH');
    for (let i = 0; i < length; i++) {
      c.set(i === length - 1 ? 30000 : 0);
      press(session, 'KeyJ');
    }
    return session;
  };

  it('a session of length 5 is done after 5 correct attempts and rates by 5', () => {
    const session = run(5, 0);
    expect(session.state().targets).toHaveLength(5);
    expect(session.state()).toMatchObject({ done: true, index: 5 });
    expect(session.state().results).toEqual({ totalSeconds: 30, neumesPerMinute: 10, accuracyPercent: 100 });
  });

  it('accuracy uses targets.length', () => {
    expect(run(5, 1).state().results?.accuracyPercent).toBe(83.3);
  });

  it('attempts after the last of 5 targets are ignored', () => {
    const session = run(5, 0);
    press(session, 'KeyH');
    press(session, 'KeyJ');
    expect(session.state()).toMatchObject({ attempts: 5, errors: 0, index: 5 });
  });

  it('restart keeps the length', () => {
    const session = run(5, 0);
    session.restart();
    expect(session.state().targets).toHaveLength(5);
  });

  it('createSession throws on a length that is not a positive integer', () => {
    for (const length of [0, -1, 2.5]) {
      expect(() => createSession({ random: () => 0, now: () => 0, length })).toThrow(/length/);
    }
  });
});

describe('a solo modifier attempt on release', () => {
  const soloTriggers = new Set(['KeyB']);
  const haplo = (c: ReturnType<typeof clock>) => {
    // The draw is all J (no keymap entry has B alone yet), so a solo B is judged against J.
    return createSession({ random: () => 0, now: c.now, soloTriggers });
  };

  it('a solo B on a J target is one error and starts the clock on release', () => {
    const c = clock();
    const session = haplo(c);
    c.set(500);
    session.handle({ type: 'down', code: 'KeyB' });
    expect(session.state()).toMatchObject({ attempts: 0, startedAt: null });
    session.handle({ type: 'up', code: 'KeyB' });
    expect(session.state()).toMatchObject({ attempts: 1, errors: 1, index: 0, startedAt: 500 });
  });

  it('B held then J is judged B + J, and the release adds nothing', () => {
    const session = haplo(clock());
    session.handle({ type: 'down', code: 'KeyB' });
    session.handle({ type: 'down', code: 'KeyJ' });
    session.handle({ type: 'up', code: 'KeyJ' });
    session.handle({ type: 'up', code: 'KeyB' });
    expect(session.state()).toMatchObject({ attempts: 1, errors: 1 });
  });
});

describe('practice options', () => {
  const press = (session: ReturnType<typeof createSession>, code: string) => {
    session.handle({ type: 'down', code });
    session.handle({ type: 'up', code });
  };

  it('configure({ drillId: KeyR }) restarts with only R targets', () => {
    const session = createSession({ random: seededRandom(5), now: () => 0 });
    press(session, 'KeyH');
    session.configure({ drillId: 'KeyR' });
    const state = session.state();
    expect(state).toMatchObject({ drillId: 'KeyR', index: 0, errors: 0, attempts: 0 });
    for (const e of state.targets) expect(e.modifiers).toContain('KeyR');
  });

  it('the default drill is all and the default draw is unchanged', () => {
    const a = createSession({ random: seededRandom(9), now: () => 0 }).state();
    expect(a.drillId).toBe('all');
    expect(a.targets).toEqual(sampleTargets(seededRandom(9)));
  });

  it('showShortcuts makes hintVisible true from the start and after correct attempts', () => {
    const session = createSession({ random: () => 0, now: () => 0, showShortcuts: true });
    expect(session.state().hintVisible).toBe(true);
    press(session, 'KeyJ');
    expect(session.state()).toMatchObject({ index: 1, hintVisible: true });
  });

  it('without showShortcuts hintVisible follows the last wrong attempt', () => {
    const session = createSession({ random: () => 0, now: () => 0 });
    expect(session.state().hintVisible).toBe(false);
    press(session, 'KeyH');
    expect(session.state().hintVisible).toBe(true);
    press(session, 'KeyJ');
    expect(session.state().hintVisible).toBe(false);
  });

  it('hintVisible is false when done', () => {
    const session = createSession({ random: () => 0, now: () => 0, showShortcuts: true, length: 2 });
    press(session, 'KeyJ');
    press(session, 'KeyJ');
    expect(session.state()).toMatchObject({ done: true, hintVisible: false });
  });

  it('configure can toggle showShortcuts and restarts', () => {
    const session = createSession({ random: () => 0, now: () => 0 });
    press(session, 'KeyJ');
    session.configure({ showShortcuts: true });
    expect(session.state()).toMatchObject({ showShortcuts: true, index: 0, attempts: 0, hintVisible: true });
  });

  it('tallies count attempts and errors per target and reset on restart', () => {
    const session = createSession({ random: () => 0, now: () => 0 }); // all J
    press(session, 'KeyH');
    press(session, 'KeyH');
    press(session, 'KeyJ');
    expect(session.state().tallies).toEqual({ ison: { attempts: 3, errors: 2 } });
    session.restart();
    expect(session.state().tallies).toEqual({});
  });

  it('keys on the results screen do not change tallies', () => {
    const session = createSession({ random: () => 0, now: () => 0, length: 1 });
    press(session, 'KeyJ');
    const before = session.state().tallies;
    press(session, 'KeyH');
    press(session, 'KeyJ');
    expect(session.state().tallies).toEqual(before);
    expect(before).toEqual({ ison: { attempts: 1, errors: 0 } });
  });

  it('configure throws on an unknown drill id', () => {
    const session = createSession({ random: () => 0, now: () => 0 });
    expect(() => session.configure({ drillId: 'nope' })).toThrow('drillPool: unknown drill "nope"');
    expect(session.state().drillId).toBe('all');
  });
});

describe('onComplete', () => {
  const press = (session: ReturnType<typeof createSession>, code: string) => {
    session.handle({ type: 'down', code });
    session.handle({ type: 'up', code });
  };

  it('is called once with results and tallies at the completing attempt', () => {
    const runs: unknown[] = [];
    const c = clock();
    const session = createSession({ random: () => 0, now: c.now, length: 2, onComplete: (r) => runs.push(r) });
    c.set(0);
    press(session, 'KeyH');
    press(session, 'KeyJ');
    expect(runs).toHaveLength(0);
    c.set(60000);
    press(session, 'KeyJ');
    expect(runs).toEqual([
      {
        drillId: 'all',
        length: 2,
        practice: false,
        results: { totalSeconds: 60, neumesPerMinute: 2, accuracyPercent: 66.7 },
        tallies: { ison: { attempts: 3, errors: 1 } },
      },
    ]);
  });

  it('reports practice when shortcuts are on', () => {
    const runs: { practice: boolean }[] = [];
    const session = createSession({ random: () => 0, now: () => 0, length: 1, showShortcuts: true, onComplete: (r) => runs.push(r) });
    press(session, 'KeyJ');
    expect(runs[0].practice).toBe(true);
  });

  it('is not called on restart', () => {
    let calls = 0;
    const session = createSession({ random: () => 0, now: () => 0, length: 1, onComplete: () => calls++ });
    session.restart();
    session.configure({ showShortcuts: true });
    expect(calls).toBe(0);
  });

  it('is not called again by keys on the results screen', () => {
    let calls = 0;
    const session = createSession({ random: () => 0, now: () => 0, length: 1, onComplete: () => calls++ });
    press(session, 'KeyJ');
    press(session, 'KeyJ');
    press(session, 'KeyH');
    expect(calls).toBe(1);
  });
});

describe('selectable test length', () => {
  const press = (session: ReturnType<typeof createSession>, code: string) => {
    session.handle({ type: 'down', code });
    session.handle({ type: 'up', code });
  };

  it('offers 10, 20 and 50, with 20 as the default', () => {
    expect(LENGTH_OPTIONS).toEqual([10, 20, 50]);
    expect(TEST_LENGTH).toBe(20);
    expect(createSession({ random: () => 0, now: () => 0 }).state().length).toBe(20);
  });

  it('configure({ length: 10 }) restarts with 10 targets and finishes after 10', () => {
    const session = createSession({ random: () => 0, now: () => 0 });
    press(session, 'KeyJ');
    session.configure({ length: 10 });
    expect(session.state()).toMatchObject({ length: 10, index: 0, attempts: 0 });
    expect(session.state().targets).toHaveLength(10);
    for (let i = 0; i < 10; i++) press(session, 'KeyJ');
    expect(session.state().done).toBe(true);
  });

  it('configure({ length: 50 }) draws 50 targets and keeps the drill', () => {
    const session = createSession({ random: seededRandom(3), now: () => 0, drillId: 'KeyR' });
    session.configure({ length: 50 });
    expect(session.state().targets).toHaveLength(50);
    expect(session.state().drillId).toBe('KeyR');
  });

  it('configure throws on length 30 and changes nothing', () => {
    const session = createSession({ random: () => 0, now: () => 0 });
    expect(() => session.configure({ length: 30 })).toThrow(/length/);
    expect(session.state().length).toBe(20);
    expect(session.state().targets).toHaveLength(20);
  });

  it('onComplete reports the chosen length', () => {
    const runs: { length: number }[] = [];
    const session = createSession({ random: () => 0, now: () => 0, onComplete: (r) => runs.push(r) });
    session.configure({ length: 10 });
    for (let i = 0; i < 10; i++) press(session, 'KeyJ');
    expect(runs.map((r) => r.length)).toEqual([10]);
  });
});

describe('sampleTargets with noRepeats', () => {
  // Golden draws captured from the code before the option existed.
  const GOLDEN_ALL_SEED_1 = ["petastiApostrofos", "ison", "runningElafron", "oligonElafronApostrofos", "oligonElafron", "petastiIson", "chamili", "oligonIsonKentimata", "apostrofos", "leimma4", "isonApostrofos", "isonApostrofos", "oligon", "apostrofos", "oligonYpsiliRight", "oligon", "isonApostrofos", "ison", "apostrofos", "oligonIsonKentimata"];
  const GOLDEN_D_SEED_42 = ["yporroi", "yporroi", "oligonYporroi", "petastiYporroi", "yporroi", "yporroi", "yporroi", "yporroi", "oligonYporroi", "yporroi", "yporroi", "oligonYporroi", "petastiYporroi", "yporroi", "yporroi", "yporroi", "petastiYporroi", "yporroi", "yporroi", "yporroi", "oligonYporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "petastiYporroi", "yporroi", "yporroi", "yporroi", "oligonYporroi", "yporroi", "petastiYporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "yporroi", "petastiYporroi", "oligonYporroi", "yporroi", "yporroi", "yporroi", "yporroi"];
  const ids = (t: readonly { id: string }[]) => t.map((e) => e.id);
  const adjacentRepeats = (t: readonly { id: string }[]) => t.some((e, i) => i > 0 && e.id === t[i - 1].id);
  const quantity = keymap.filter((e) => e.table === 'quantity');

  it('the D golden draw has an adjacent pair, so the on-tests below mean something', () => {
    expect(GOLDEN_D_SEED_42.some((id, i) => i > 0 && id === GOLDEN_D_SEED_42[i - 1])).toBe(true);
  });

  it('off is identical to today for fixed seeds', () => {
    for (const options of [undefined, { noRepeats: false }]) {
      expect(ids(sampleTargets(seededRandom(1), drillPool('all'), 20, options))).toEqual(GOLDEN_ALL_SEED_1);
      expect(ids(sampleTargets(seededRandom(42), drillPool('KeyD'), 50, options))).toEqual(GOLDEN_D_SEED_42);
    }
  });

  it('on never repeats an id back to back, over many seeds and every drill', () => {
    for (const drill of drills()) {
      for (let seed = 1; seed <= 200; seed++) {
        const t = sampleTargets(seededRandom(seed), drillPool(drill.id), 50, { noRepeats: true });
        expect(t).toHaveLength(50);
        expect(adjacentRepeats(t), `${drill.id} seed ${seed}`).toBe(false);
      }
    }
  });

  it('on: the first target equals the off draw for the same seed', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const on = sampleTargets(seededRandom(seed), drillPool('all'), 5, { noRepeats: true });
      const off = sampleTargets(seededRandom(seed), drillPool('all'), 5);
      expect(on[0].id).toBe(off[0].id);
    }
  });

  it('on uses exactly one random() per target', () => {
    let calls = 0;
    const counted = () => {
      calls++;
      return seededRandom(7)();
    };
    sampleTargets(counted, drillPool('KeyD'), 50, { noRepeats: true });
    expect(calls).toBe(50);
  });

  it('on: later positions follow the renormalised chances (exact edges)', () => {
    const mk = (id: string, pitch: number): KeymapEntry => ({ ...keymap[0], id, pitch, frequency: 'common' });
    const pool = [mk('a', 0), mk('b', 1), mk('c', 2)];
    const [a, b] = neumeChances(pool);
    const edge = b / (1 - a);
    const draw = (second: number) => {
      const values = [0, second];
      let i = 0;
      return ids(sampleTargets(() => values[i++], pool, 2, { noRepeats: true }));
    };
    expect(draw(0)).toEqual(['a', 'b']);
    expect(draw(edge - 1e-9)).toEqual(['a', 'b']);
    expect(draw(edge + 1e-9)).toEqual(['a', 'c']);
    expect(draw(1 - 2 ** -53)).toEqual(['a', 'c']);
  });

  it('on: transitions from ison follow c_j / (1 - c_ison) over a large seeded sample', () => {
    const n = 200_000;
    const pool = drawPool(quantity);
    const chances = neumeChances(pool);
    const cIson = chances[pool.findIndex((e) => e.id === 'ison')];
    const t = sampleTargets(seededRandom(12345), quantity, n, { noRepeats: true });
    const next = new Map<string, number>();
    let fromIson = 0;
    for (let i = 0; i < n - 1; i++) {
      if (t[i].id !== 'ison') continue;
      fromIson++;
      next.set(t[i + 1].id, (next.get(t[i + 1].id) ?? 0) + 1);
    }
    expect(next.get('ison') ?? 0).toBe(0);
    pool.forEach((e, k) => {
      if (e.id === 'ison') return;
      const p = chances[k] / (1 - cIson);
      const observed = (next.get(e.id) ?? 0) / fromIson;
      expect(Math.abs(observed - p), e.id).toBeLessThan(5 * Math.sqrt((p * (1 - p)) / fromIson));
    });
  });

  it('on: the rounding fallback never returns the previous entry', () => {
    const t = sampleTargets(() => 1 - 2 ** -53, drillPool('all'), 10, { noRepeats: true });
    expect(t.every((e) => e !== undefined)).toBe(true);
    expect(adjacentRepeats(t)).toBe(false);
  });

  it('assertNoRepeatsPossible throws for a 1-entry pool when count > 1, and not when count is 1', () => {
    const one = [keymap[0]];
    expect(() => assertNoRepeatsPossible(one, 2)).toThrow('sampleTargets: noRepeats needs at least 2 drawable entries');
    expect(() => assertNoRepeatsPossible(one, 1)).not.toThrow();
    expect(() => sampleTargets(() => 0, one, 2, { noRepeats: true })).toThrow('noRepeats needs at least 2');
    expect(sampleTargets(() => 0, one, 1, { noRepeats: true })).toHaveLength(1);
    expect(sampleTargets(() => 0, one, 3)).toHaveLength(3); // off: repeats are fine
  });
});

describe('a session with noRepeats', () => {
  const adjacent = (t: readonly { id: string }[]) => t.some((e, i) => i > 0 && e.id === t[i - 1].id);

  it('draws targets with no adjacent repeats, and state().noRepeats is true', () => {
    const session = createSession({ random: seededRandom(42), now: () => 0, drillId: 'KeyD', length: 50, noRepeats: true });
    expect(session.state().noRepeats).toBe(true);
    expect(adjacent(session.state().targets)).toBe(false);
  });

  it('is off by default', () => {
    expect(createSession({ random: () => 0, now: () => 0 }).state().noRepeats).toBe(false);
  });

  it('configure({ noRepeats: true }) restarts with no adjacent repeats', () => {
    const session = createSession({ random: seededRandom(42), now: () => 0, drillId: 'KeyD', length: 50 });
    session.handle({ type: 'down', code: 'KeyH' });
    session.configure({ noRepeats: true });
    expect(session.state()).toMatchObject({ noRepeats: true, attempts: 0, index: 0 });
    expect(adjacent(session.state().targets)).toBe(false);
  });

  it('configure({ noRepeats: false }) goes back to the plain draw path', () => {
    const session = createSession({ random: seededRandom(5), now: () => 0, drillId: 'KeyD', length: 50, noRepeats: true });
    session.configure({ noRepeats: false }); // draws the next 50 values from the same stream, plainly
    expect(session.state().noRepeats).toBe(false);
    const replay = seededRandom(5);
    for (let i = 0; i < 50; i++) replay(); // skip the first (noRepeats) draw
    expect(session.state().targets.map((e) => e.id)).toEqual(
      sampleTargets(replay, drillPool('KeyD'), 50).map((e) => e.id),
    );
  });
});
