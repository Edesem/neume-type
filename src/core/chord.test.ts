import { describe, expect, it } from 'vitest';
import { keymap } from '../data/keymap';
import { script } from '../test-utils/keyScript';
import { attemptMatches, createChordTracker, physicalCode, type ChordResult } from './chord';

/** Run a key script through a fresh tracker; waits are irrelevant (R2). */
function run(steps: string[], solo?: ReadonlySet<string>): ChordResult[] {
  const tracker = createChordTracker(solo);
  const results: ChordResult[] = [];
  for (const item of script(steps)) {
    if ('blur' in item) tracker.blur();
    else if ('wait' in item) continue;
    else results.push(tracker.handle(item));
  }
  return results;
}

const target = (id: string) => keymap.find((e) => e.id === id)!;
const ISON = 'ison';
const OLIGON = 'oligon';
const KENTIMA_BELOW = 'oligonKentimaBelow'; // L
const KENTIMA = 'oligonKentimaMiddle'; // S + L
const KENTIMATA_OLIGON = 'oligonKentimataBelow'; // Shift + R + K
const R_K = 'oligonKentimataAbove'; // R + K
const PETASTI = 'petasti'; // Shift + K
const CROSS = 'stavros'; // Shift + =

/** Attempts in order, each scored against the next target in `targets`; returns pass/fail per attempt. */
function judge(results: ChordResult[], targets: string[]): boolean[] {
  const attempts = results.filter((r) => r.kind === 'attempt');
  return attempts.map((a, i) => attemptMatches(a, target(targets[Math.min(i, targets.length - 1)])));
}

describe('C1 to C22 worked examples', () => {
  it('C1: L alone matches Oligon with Kentēma (below)', () => {
    expect(judge(run(['↓L']), [KENTIMA_BELOW])).toEqual([true]);
  });

  it('C2: S+L, released L then S, matches S+L', () => {
    expect(judge(run(['↓S', '↓L', '↑L', '↑S']), [KENTIMA])).toEqual([true]);
  });

  it('C3: S+L, released S then L, matches S+L (R5)', () => {
    expect(judge(run(['↓S', '↓L', '↑S', '↑L']), [KENTIMA])).toEqual([true]);
  });

  it('C4: S tapped and released then L is one attempt judged as L (R3)', () => {
    const results = run(['↓S', '↑S', '↓L']);
    expect(results.filter((r) => r.kind === 'attempt')).toHaveLength(1);
    expect(judge(results, [KENTIMA])).toEqual([false]);
    expect(judge(results, [KENTIMA_BELOW])).toEqual([true]);
  });

  it('C5: L then S is one attempt (L) and S makes none (R4)', () => {
    const results = run(['↓L', '↓S']);
    expect(results.filter((r) => r.kind === 'attempt')).toHaveLength(1);
    expect(judge(results, [KENTIMA])).toEqual([false]);
  });

  it('C6: S held then L on an L target is wrong, judged as S+L', () => {
    expect(judge(run(['↓S', '↓L']), [KENTIMA_BELOW])).toEqual([false]);
  });

  it('C7: S tapped alone makes no attempt', () => {
    const results = run(['↓S', '↑S']);
    expect(results.some((r) => r.kind === 'attempt')).toBe(false);
  });

  it('C8: S, long pause, L is correct because the tracker has no timing (R2)', () => {
    // No timestamps exist on events, so a pause cannot change the result.
    expect(judge(run(['↓S', '↓L']), [KENTIMA])).toEqual([true]);
  });

  it('C9: Shift, R, K matches Shift+R+K', () => {
    expect(judge(run(['↓Shift', '↓R', '↓K']), [KENTIMATA_OLIGON])).toEqual([true]);
  });

  it('C10: R, Shift, K matches Shift+R+K (R4)', () => {
    expect(judge(run(['↓R', '↓Shift', '↓K']), [KENTIMATA_OLIGON])).toEqual([true]);
  });

  it('C11: Shift, R, K on an R+K target is wrong (R1)', () => {
    expect(judge(run(['↓Shift', '↓R', '↓K']), [R_K])).toEqual([false]);
  });

  it('C12: S, D, L on an L target is one wrong attempt (R8)', () => {
    const results = run(['↓S', '↓D', '↓L']);
    expect(results.filter((r) => r.kind === 'attempt')).toHaveLength(1);
    expect(judge(results, [KENTIMA_BELOW])).toEqual([false]);
  });

  it('C13: repeats of a held J are ignored (R7)', () => {
    const results = run(['↓J', '↓J!', '↓J!', '↓J!']);
    expect(results.map((r) => r.kind)).toEqual(['attempt', 'ignored', 'ignored', 'ignored']);
  });

  it('C14: S+L, release L, press L again, is S+L twice (R5)', () => {
    expect(judge(run(['↓S', '↓L', '↑L', '↓L']), [KENTIMA, KENTIMA])).toEqual([true, true]);
  });

  it('C15: S+L, release L, press N is S+N, wrong for an N target (R5)', () => {
    const results = run(['↓S', '↓L', '↑L', '↓N']);
    expect(judge(results, [KENTIMA, 'apostrofos'])).toEqual([true, false]);
  });

  it('C16: J then K rolled over are two attempts (R9)', () => {
    const results = run(['↓J', '↓K', '↑J', '↑K']);
    expect(judge(results, [ISON, OLIGON])).toEqual([true, true]);
  });

  it('C17: Meta then J is ignored and not prevented (R12)', () => {
    const results = run(['↓Meta', '↓J']);
    expect(results.map((r) => r.kind)).toEqual(['ignored', 'ignored']);
    expect(results.map((r) => r.preventDefault)).toEqual([false, false]);
  });

  it('C18: H on a J target is a wrong attempt (R10)', () => {
    const results = run(['↓H']);
    expect(results[0].kind).toBe('attempt');
    expect(judge(results, [ISON])).toEqual([false]);
  });

  it('C19: Space and Tab are ignored and not prevented (R11)', () => {
    const results = run(['↓Space', '↓Tab']);
    expect(results.map((r) => r.kind)).toEqual(['ignored', 'ignored']);
    expect(results.map((r) => r.preventDefault)).toEqual([false, false]);
  });

  it('C20: S, window blur, L is just L (R14)', () => {
    expect(judge(run(['↓S', 'blur', '↓L']), [KENTIMA_BELOW])).toEqual([true]);
  });

  it('C21: both Shifts down, one up, K is still Shift+K', () => {
    expect(judge(run(['↓ShiftLeft', '↓ShiftRight', '↑ShiftLeft', '↓K']), [PETASTI])).toEqual([true]);
  });

  it('C22: Shift+= matches Cross by event.code', () => {
    expect(judge(run(['↓Shift', '↓=']), [CROSS])).toEqual([true]);
  });
});

describe('rules not covered by a worked example', () => {
  it('R6: a modifier keydown is held, prevented, and never an attempt', () => {
    const [r] = run(['↓S']);
    expect(r).toMatchObject({ kind: 'held', preventDefault: true });
  });

  it('R13: a scored keydown is an attempt and is prevented', () => {
    const [r] = run(['↓/']);
    expect(r).toMatchObject({ kind: 'attempt', preventDefault: true, trigger: 'Slash' });
  });

  it('R14: Shift state is synced from event.shiftKey on keydown', () => {
    const t = createChordTracker();
    t.handle({ type: 'down', code: 'ShiftLeft', shiftKey: true });
    // Shift keyup was lost; the next keydown reports shiftKey false.
    const r = t.handle({ type: 'down', code: 'KeyK', shiftKey: false });
    expect(r).toMatchObject({ kind: 'attempt', modifiers: [] });
  });

  it('R14: event.shiftKey true resyncs Shift when no Shift keydown was seen', () => {
    const t = createChordTracker();
    const r = t.handle({ type: 'down', code: 'KeyK', shiftKey: true });
    expect(r).toMatchObject({ kind: 'attempt', modifiers: ['Shift'] });
    expect(attemptMatches(r as never, target(PETASTI))).toBe(true);
  });

  it('R7 with R13: repeats of modifier and scored keys are ignored but prevented', () => {
    const results = run(['↓S', '↓S!', '↓J', '↓J!', '↓Space', '↓Space!']);
    expect(results.map((r) => [r.kind, r.preventDefault])).toEqual([
      ['held', true], ['ignored', true], ['attempt', true], ['ignored', true],
      ['ignored', false], ['ignored', false],
    ]);
  });

  it('C21 (tracking only): the second Shift keeps Shift held after the first is released', () => {
    // No shiftKey on any event, so only the tracker's own held set can supply Shift.
    const t = createChordTracker();
    t.handle({ type: 'down', code: 'ShiftLeft' });
    t.handle({ type: 'down', code: 'ShiftRight' });
    t.handle({ type: 'up', code: 'ShiftLeft' });
    expect(t.handle({ type: 'down', code: 'KeyK' })).toMatchObject({ modifiers: ['Shift'] });
    t.handle({ type: 'up', code: 'ShiftRight' });
    expect(t.handle({ type: 'down', code: 'KeyK' })).toMatchObject({ modifiers: [] });
  });

  it('R14: a keyup for a key not held is ignored', () => {
    expect(run(['↑S'])[0]).toMatchObject({ kind: 'ignored', preventDefault: false });
  });

  it('R14: events with isComposing are ignored', () => {
    const t = createChordTracker();
    expect(t.handle({ type: 'down', code: 'KeyJ', isComposing: true })).toMatchObject({
      kind: 'ignored',
      preventDefault: false,
    });
  });

  it('R12: Ctrl and Alt also make keydowns ignored and unprevented', () => {
    const t = createChordTracker();
    expect(t.handle({ type: 'down', code: 'KeyJ', ctrlKey: true })).toMatchObject({ kind: 'ignored', preventDefault: false });
    expect(t.handle({ type: 'down', code: 'KeyJ', altKey: true })).toMatchObject({ kind: 'ignored', preventDefault: false });
  });
});

describe('physicalCode', () => {
  it('maps the logical Shift to ShiftLeft and leaves other modifiers alone', () => {
    expect(physicalCode('Shift')).toBe('ShiftLeft');
    expect(physicalCode('KeyS')).toBe('KeyS');
  });
});

describe('C23 to C29: a lone modifier scores on release (solo entry for B, test data only)', () => {
  const SOLO = new Set(['KeyB']);
  const hapli = { ...target(ISON), id: 'hapli', modifiers: [], trigger: 'KeyB' };
  const kinds = (steps: string[]) => run(steps, SOLO).map((r) => r.kind);
  const attemptOf = (steps: string[]) => {
    const r = run(steps, SOLO).find((x) => x.kind === 'attempt');
    if (!r || r.kind !== 'attempt') throw new Error('no attempt');
    return r;
  };

  it('C23: B pressed and released alone is one attempt on release, trigger B, no modifiers', () => {
    expect(kinds(['↓B', '↑B'])).toEqual(['held', 'attempt']);
    const a = attemptOf(['↓B', '↑B']);
    expect(a).toMatchObject({ trigger: 'KeyB', modifiers: [], preventDefault: false });
    expect(attemptMatches(a, hapli)).toBe(true);
  });

  it('C24: B held then J is one attempt (B + J) and the B release adds none', () => {
    expect(kinds(['↓B', '↓J', '↑J', '↑B'])).toEqual(['held', 'attempt', 'ignored', 'ignored']);
    expect(attemptOf(['↓B', '↓J', '↑J', '↑B'])).toMatchObject({ trigger: 'KeyJ', modifiers: ['KeyB'] });
  });

  it('C24b: B tapped while S is held is attempt B with S; S pressed after B cancels it', () => {
    expect(kinds(['↓S', '↓B', '↑B', '↑S'])).toEqual(['held', 'held', 'attempt', 'ignored']);
    expect(attemptOf(['↓S', '↓B', '↑B', '↑S'])).toMatchObject({ trigger: 'KeyB', modifiers: ['KeyS'] });
    expect(kinds(['↓B', '↓S', '↑S', '↑B'])).toEqual(['held', 'held', 'ignored', 'ignored']);
  });

  it('C25: auto-repeats of B do not cancel it; release gives one attempt', () => {
    expect(kinds(['↓B', '↓B!', '↓B!', '↑B'])).toEqual(['held', 'ignored', 'ignored', 'attempt']);
  });

  it('C26: B, window blur, B release gives nothing', () => {
    expect(kinds(['↓B', 'blur', '↑B'])).toEqual(['held', 'ignored']);
  });

  it('C27: Shift held, B tapped gives attempt B with Shift (wrong for a B-alone target)', () => {
    const a = attemptOf(['↓Shift', '↓B', '↑B']);
    expect(a).toMatchObject({ trigger: 'KeyB', modifiers: ['Shift'] });
    expect(attemptMatches(a, hapli)).toBe(false);
  });

  it('C28: B, Meta down, B release gives nothing', () => {
    expect(kinds(['↓B', '↓Meta', '↑B'])).toEqual(['held', 'ignored', 'ignored']);
  });

  it('C29: Shift released before B release gives attempt B with no modifiers', () => {
    expect(attemptOf(['↓Shift', '↓B', '↑Shift', '↑B'])).toMatchObject({ trigger: 'KeyB', modifiers: [] });
  });

  it('a Space or Tab keydown while B is held cancels it', () => {
    expect(kinds(['↓B', '↓Space', '↑B'])).toEqual(['held', 'ignored', 'ignored']);
  });

  it('C7 still holds with B in the solo set: S tapped alone gives nothing', () => {
    expect(kinds(['↓S', '↑S'])).toEqual(['held', 'ignored']);
  });

  it('with no solo triggers (today) B tapped alone gives nothing', () => {
    expect(run(['↓B', '↑B']).map((r) => r.kind)).toEqual(['held', 'ignored']);
  });
});

