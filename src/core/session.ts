import type { KeymapEntry } from '../data/keymap';
import { DEFAULT_DRILL_ID, drillPool } from './drills';
import type { Tallies } from './stats';
import { drawPool, neumeChances } from './weights';
import { attemptMatches, createChordTracker, type ChordResult, type KeyEventLike } from './chord';

export const TEST_LENGTH = 20;
/** The test lengths the player can choose. */
export const LENGTH_OPTIONS = [10, 20, 50] as const;

export interface Results {
  /** Seconds, rounded to 2 decimals. */
  totalSeconds: number;
  /** Neumes per minute, rounded to 1 decimal. Null when the run took zero time (undefined rate). */
  neumesPerMinute: number | null;
  /** Percent, rounded to 1 decimal. */
  accuracyPercent: number;
}

export interface SessionState {
  targets: readonly KeymapEntry[];
  /** Index of the current neume; equals targets.length when done. */
  index: number;
  errors: number;
  attempts: number;
  startedAt: number | null;
  endedAt: number | null;
  /** True after a wrong attempt on the current neume, until it is entered correctly or the test restarts. */
  lastAttemptWrong: boolean;
  /** The hint (name and shortcut) shows: always when `showShortcuts`, else after a wrong attempt; never when done. */
  hintVisible: boolean;
  drillId: string;
  showShortcuts: boolean;
  /** Number of neumes in the test (equals `targets.length`). */
  length: number;
  /** True when the same neume is never drawn twice in a row. */
  noRepeats: boolean;
  /** Attempts and errors per target id for the current run. */
  tallies: Tallies;
  done: boolean;
  results: Results | null;
}

export interface CompletedRun {
  drillId: string;
  length: number;
  /** True when shortcuts were shown for the run. */
  practice: boolean;
  results: Results;
  tallies: Tallies;
}

export interface SessionOptions {
  /** Returns a number in [0, 1), like Math.random. */
  random: () => number;
  /** Returns the current time in ms. */
  now: () => number;
  /** Number of neumes in a test (default TEST_LENGTH). */
  length?: number;
  /** Modifier keys that score alone on release; defaults to the keymap's (none today). */
  soloTriggers?: ReadonlySet<string>;
  /** Drill to draw from (default `all`). */
  drillId?: string;
  /** Show the name and shortcut of the current neume from the start. */
  showShortcuts?: boolean;
  /** Never draw the same neume twice in a row (default false). */
  noRepeats?: boolean;
  /** Called once, at the attempt that completes a run. Not called by restart or by keys on the results screen. */
  onComplete?: (run: CompletedRun) => void;
}

/** Throws when a no-repeat run of `count` neumes is impossible: fewer than 2 distinct entries and count > 1. */
export function assertNoRepeatsPossible(pool: readonly KeymapEntry[], count: number): void {
  if (pool.length < 2 && count > 1) throw new Error('sampleTargets: noRepeats needs at least 2 drawable entries');
}

/**
 * Draw `count` neumes with replacement from entries not marked unverified, using the chances
 * from `neumeChances` (docs/neume-weights.md). `random()` must return a number in [0, 1).
 * With `noRepeats`, no id appears twice in a row: later positions are drawn from the pool minus the
 * previous id with the chances renormalised (c_j / (1 - c_prev)). One `random()` per target either way.
 */
export function sampleTargets(
  random: () => number,
  entries: readonly KeymapEntry[] = drillPool(DEFAULT_DRILL_ID),
  count: number = TEST_LENGTH,
  options: { noRepeats?: boolean } = {},
): KeymapEntry[] {
  const pool = drawPool(entries);
  const chances = neumeChances(pool);
  let running = 0;
  const upTo = chances.map((p) => (running += p));
  if (!options.noRepeats) {
    return Array.from({ length: count }, () => {
      const r = random();
      // First entry whose cumulative chance exceeds r. Rounding can leave the last total a hair
      // under 1, so fall back to the last entry.
      const i = upTo.findIndex((edge) => r < edge);
      return pool[i === -1 ? pool.length - 1 : i];
    });
  }

  assertNoRepeatsPossible(pool, count);
  const picked: KeymapEntry[] = [];
  let prev = -1;
  for (let n = 0; n < count; n++) {
    let chosen = -1;
    if (prev === -1) {
      const r = random();
      chosen = upTo.findIndex((edge) => r < edge);
      if (chosen === -1) chosen = pool.length - 1;
    } else {
      // Scale into the room left without `prev`, then walk the chances skipping it.
      const r = random() * (1 - chances[prev]);
      let acc = 0;
      let last = -1;
      for (let k = 0; k < pool.length; k++) {
        if (k === prev) continue;
        last = k;
        acc += chances[k];
        if (r < acc) {
          chosen = k;
          break;
        }
      }
      if (chosen === -1) chosen = last; // rounding fell short: the last entry that is not `prev`
    }
    picked.push(pool[chosen]);
    prev = chosen;
  }
  return picked;
}

const round = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

export function createSession(options: SessionOptions) {
  const { random, now, soloTriggers } = options;
  let length = options.length ?? TEST_LENGTH;
  let drillId = options.drillId ?? DEFAULT_DRILL_ID;
  let showShortcuts = options.showShortcuts ?? false;
  let noRepeats = options.noRepeats ?? false;
  if (!Number.isInteger(length) || length < 1) throw new Error(`createSession: length must be a positive integer, got ${length}`);
  const tracker = createChordTracker(soloTriggers);

  let targets: readonly KeymapEntry[] = [];
  let index = 0;
  let errors = 0;
  let attempts = 0;
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let lastAttemptWrong = false;
  let tallies: Record<string, { attempts: number; errors: number }> = {};

  const restart = () => {
    // R15: the tracker's held set is left alone because keys are physically still down.
    targets = sampleTargets(random, drillPool(drillId), length, { noRepeats });
    index = 0;
    errors = 0;
    attempts = 0;
    startedAt = null;
    endedAt = null;
    lastAttemptWrong = false;
    tallies = {};
  };
  restart();

  const state = (): SessionState => {
    const done = index >= targets.length;
    let results: Results | null = null;
    if (done && startedAt !== null && endedAt !== null) {
      const ms = endedAt - startedAt;
      results = {
        totalSeconds: round(ms / 1000, 2),
        neumesPerMinute: ms > 0 ? round(targets.length / (ms / 60000), 1) : null,
        accuracyPercent: round((targets.length / attempts) * 100, 1),
      };
    }
    const copy = Object.fromEntries(Object.entries(tallies).map(([id, t]) => [id, { ...t }]));
    return {
      targets, index, errors, attempts, startedAt, endedAt, lastAttemptWrong,
      hintVisible: !done && (showShortcuts || lastAttemptWrong),
      drillId, showShortcuts, length, noRepeats, tallies: copy, done, results,
    };
  };

  return {
    state,
    restart,
    /** Change the drill, the show-shortcuts option, the length and/or avoid-repeats, then restart. Throws on an unknown drill or length. */
    configure(patch: { drillId?: string; showShortcuts?: boolean; length?: number; noRepeats?: boolean }) {
      if (patch.drillId !== undefined) drillPool(patch.drillId); // validate before changing anything
      if (patch.length !== undefined && !(LENGTH_OPTIONS as readonly number[]).includes(patch.length)) {
        throw new Error(`configure: length must be one of ${LENGTH_OPTIONS.join(', ')}, got ${patch.length}`);
      }
      // Validate the resulting combination before assigning anything, so a throw changes nothing.
      const nextNoRepeats = patch.noRepeats ?? noRepeats;
      if (nextNoRepeats) assertNoRepeatsPossible(drillPool(patch.drillId ?? drillId), patch.length ?? length);
      if (patch.length !== undefined) length = patch.length;
      if (patch.noRepeats !== undefined) noRepeats = patch.noRepeats;
      if (patch.drillId !== undefined) drillId = patch.drillId;
      if (patch.showShortcuts !== undefined) showShortcuts = patch.showShortcuts;
      restart();
    },
    blur: () => tracker.blur(),
    handle(event: KeyEventLike): ChordResult {
      const result = tracker.handle(event);
      // Attempts on the results screen are ignored; the tracker still sees the keys.
      if (result.kind !== 'attempt' || index >= targets.length) return result;

      const time = now();
      if (startedAt === null) startedAt = time;
      attempts++;
      const tally = (tallies[targets[index].id] ??= { attempts: 0, errors: 0 });
      tally.attempts++;
      if (attemptMatches(result, targets[index])) {
        index++;
        lastAttemptWrong = false;
        if (index >= targets.length) {
          endedAt = time;
          const done = state();
          if (done.results) {
            options.onComplete?.({
              drillId, length: targets.length, practice: showShortcuts, results: done.results, tallies: done.tallies,
            });
          }
        }
      } else {
        errors++;
        tally.errors++;
        lastAttemptWrong = true;
      }
      return result;
    },
  };
}

