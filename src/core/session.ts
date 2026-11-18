import type { KeymapEntry } from '../data/keymap';
import { DEFAULT_DRILL_ID, drillPool } from './drills';
import type { Tallies } from './stats';
import { drawPool, neumeChances } from './weights';
import { attemptMatches, createChordTracker, type ChordResult, type KeyEventLike } from './chord';

export const TEST_LENGTH = 20;

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
  /** Called once, at the attempt that completes a run. Not called by restart or by keys on the results screen. */
  onComplete?: (run: CompletedRun) => void;
}

/**
 * Draw `count` neumes with replacement from entries not marked unverified, using the chances
 * from `neumeChances` (docs/neume-weights.md). `random()` must return a number in [0, 1).
 */
export function sampleTargets(
  random: () => number,
  entries: readonly KeymapEntry[] = drillPool(DEFAULT_DRILL_ID),
  count: number = TEST_LENGTH,
): KeymapEntry[] {
  const pool = drawPool(entries);
  let running = 0;
  const upTo = neumeChances(pool).map((p) => (running += p));
  return Array.from({ length: count }, () => {
    const r = random();
    // First entry whose cumulative chance exceeds r. Rounding can leave the last total a hair
    // under 1, so fall back to the last entry.
    const i = upTo.findIndex((edge) => r < edge);
    return pool[i === -1 ? pool.length - 1 : i];
  });
}

const round = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

export function createSession(options: SessionOptions) {
  const { random, now, length = TEST_LENGTH, soloTriggers } = options;
  let drillId = options.drillId ?? DEFAULT_DRILL_ID;
  let showShortcuts = options.showShortcuts ?? false;
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
    targets = sampleTargets(random, drillPool(drillId), length);
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
      drillId, showShortcuts, tallies: copy, done, results,
    };
  };

  return {
    state,
    restart,
    /** Change the drill and/or the show-shortcuts option, then restart. Throws on an unknown drill. */
    configure(patch: { drillId?: string; showShortcuts?: boolean }) {
      if (patch.drillId !== undefined) drillPool(patch.drillId); // validate before changing anything
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

