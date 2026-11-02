import { keymap, type KeymapEntry } from '../data/keymap';
import { attemptMatches, createChordTracker, type ChordResult, type KeyEventLike } from './chord';

export const TEST_LENGTH = 20;

export interface Results {
  /** Seconds, rounded to 2 decimals. */
  totalSeconds: number;
  /** Neumes per minute, rounded to 1 decimal. */
  neumesPerMinute: number;
  /** Percent, rounded to 1 decimal. */
  accuracyPercent: number;
}

export interface SessionState {
  targets: readonly KeymapEntry[];
  /** Index of the current neume; equals TEST_LENGTH when done. */
  index: number;
  errors: number;
  attempts: number;
  startedAt: number | null;
  endedAt: number | null;
  done: boolean;
  results: Results | null;
}

export interface SessionOptions {
  /** Returns a number in [0, 1), like Math.random. */
  random: () => number;
  /** Returns the current time in ms. */
  now: () => number;
  entries?: readonly KeymapEntry[];
}

/** Draw `count` neumes uniformly with replacement from entries not marked unverified. */
export function sampleTargets(
  random: () => number,
  entries: readonly KeymapEntry[] = keymap,
  count: number = TEST_LENGTH,
): KeymapEntry[] {
  const pool = entries.filter((e) => e.status !== 'unverified');
  return Array.from({ length: count }, () => pool[Math.floor(random() * pool.length)]);
}

const round = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

export function createSession(options: SessionOptions) {
  const { random, now, entries = keymap } = options;
  const tracker = createChordTracker();

  let targets: readonly KeymapEntry[] = [];
  let index = 0;
  let errors = 0;
  let attempts = 0;
  let startedAt: number | null = null;
  let endedAt: number | null = null;

  const restart = () => {
    // R15: the tracker's held set is left alone because keys are physically still down.
    targets = sampleTargets(random, entries);
    index = 0;
    errors = 0;
    attempts = 0;
    startedAt = null;
    endedAt = null;
  };
  restart();

  const state = (): SessionState => {
    const done = index >= TEST_LENGTH;
    let results: Results | null = null;
    if (done && startedAt !== null && endedAt !== null) {
      const ms = endedAt - startedAt;
      results = {
        totalSeconds: round(ms / 1000, 2),
        neumesPerMinute: round(TEST_LENGTH / (ms / 60000), 1),
        accuracyPercent: round((TEST_LENGTH / attempts) * 100, 1),
      };
    }
    return { targets, index, errors, attempts, startedAt, endedAt, done, results };
  };

  return {
    state,
    restart,
    blur: () => tracker.blur(),
    handle(event: KeyEventLike): ChordResult {
      const result = tracker.handle(event);
      // Attempts on the results screen are ignored; the tracker still sees the keys.
      if (result.kind !== 'attempt' || index >= TEST_LENGTH) return result;

      const time = now();
      if (startedAt === null) startedAt = time;
      attempts++;
      if (attemptMatches(result, targets[index])) {
        index++;
        if (index >= TEST_LENGTH) endedAt = time;
      } else {
        errors++;
      }
      return result;
    },
  };
}

export type Session = ReturnType<typeof createSession>;
