import { LENGTH_OPTIONS, type Results } from './session';
import type { NeumeTally, Tallies } from './stats';

/** Bump only for a breaking change, and add a case to `migrate`. Optional extra fields do not bump it. */
export const PROGRESS_VERSION = 1;
export const STORAGE_KEY = 'neume-type.progress';

export interface Settings {
  drillId: string;
  showShortcuts: boolean;
  /** Test length (10, 20 or 50). Optional: absent or invalid means the default (20). */
  length?: number;
  /** Never draw the same neume twice in a row. Optional: absent or invalid means off. */
  noRepeats?: boolean;
}

export interface Best {
  neumesPerMinute: number;
  accuracyPercent: number;
  totalSeconds: number;
  /** ISO date of the run. */
  date: string;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  settings: Settings;
  /** Key is `bestKey(drillId, length)`. */
  bests: Record<string, Best>;
  /** All-time attempts and errors per keymap id. Unknown ids are kept: a later keymap may know them. */
  neumes: Record<string, NeumeTally>;
}

export interface RunSummary {
  drillId: string;
  length: number;
  /** True when shortcuts were shown: such a run never sets a best. */
  practice: boolean;
  results: Results;
  tallies: Tallies;
  /** ISO date, injected so this module stays pure. */
  date: string;
}

export const emptyProgress = (): Progress => ({
  version: PROGRESS_VERSION,
  settings: { drillId: 'all', showShortcuts: false },
  bests: {},
  neumes: {},
});

export const bestKey = (drillId: string, length: number) => `${drillId}:${length}`;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isTally = (v: unknown): v is NeumeTally => isObject(v) && isCount(v.attempts) && isCount(v.errors);
const isBest = (v: unknown): v is Best =>
  isObject(v) && isCount(v.neumesPerMinute) && isCount(v.accuracyPercent) && isCount(v.totalSeconds) && typeof v.date === 'string';
const everyValue = (v: unknown, test: (x: unknown) => boolean): v is Record<string, unknown> =>
  isObject(v) && Object.values(v).every(test);

function isProgressV1(v: unknown): v is Progress {
  if (!isObject(v) || v.version !== 1) return false;
  const s = v.settings;
  if (!isObject(s) || typeof s.drillId !== 'string' || typeof s.showShortcuts !== 'boolean') return false;
  return everyValue(v.bests, isBest) && everyValue(v.neumes, isTally);
}

/** Older versions would be converted here. Only version 1 exists. */
function migrate(v: unknown): Progress | null {
  if (!isProgressV1(v)) return null;
  // An unknown or invalid stored length or noRepeats is not corruption: drop it so the default applies.
  const { length, noRepeats, ...rest } = v.settings;
  const settings: Settings = { ...rest };
  if ((LENGTH_OPTIONS as readonly number[]).includes(length as number)) settings.length = length;
  if (typeof noRepeats === 'boolean') settings.noRepeats = noRepeats;
  return { ...v, settings };
}

/**
 * Read stored text, which is untrusted. Never throws.
 * - null: empty, writable.
 * - invalid JSON or wrong shape: empty, writable, `corrupt` (the caller keeps a copy of the text).
 * - a version newer than this code: empty and NOT writable, so newer data is never overwritten.
 */
export function parseProgress(text: string | null): { progress: Progress; writable: boolean; corrupt: boolean } {
  if (text === null) return { progress: emptyProgress(), writable: true, corrupt: false };
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { progress: emptyProgress(), writable: true, corrupt: true };
  }
  if (isObject(value) && typeof value.version === 'number' && value.version > PROGRESS_VERSION) {
    return { progress: emptyProgress(), writable: false, corrupt: false };
  }
  const progress = migrate(value);
  return progress
    ? { progress, writable: true, corrupt: false }
    : { progress: emptyProgress(), writable: true, corrupt: true };
}

export const serializeProgress = (p: Progress): string => JSON.stringify(p);

/** Merge a settings patch into the saved settings (so saving a drill change keeps the saved length). */
export function withSettings(p: Progress, patch: Partial<Settings>): Progress {
  return { ...p, settings: { ...p.settings, ...patch } };
}

/**
 * Add a finished run: its tallies join the all-time totals, and it may set the personal best for its
 * drill and length (highest neumes per minute; a tie goes to higher accuracy). Practice runs and runs
 * with no rate never set a best. Does not mutate `p`. Throws on a negative tally (a caller bug).
 */
export function recordRun(p: Progress, run: RunSummary): { progress: Progress; newBest: boolean } {
  const neumes: Record<string, NeumeTally> = { ...p.neumes };
  for (const [id, t] of Object.entries(run.tallies)) {
    if (t.attempts < 0 || t.errors < 0) throw new Error(`recordRun: negative tally for "${id}"`);
    const old = neumes[id] ?? { attempts: 0, errors: 0 };
    neumes[id] = { attempts: old.attempts + t.attempts, errors: old.errors + t.errors };
  }

  const bests = { ...p.bests };
  let newBest = false;
  const { neumesPerMinute, accuracyPercent, totalSeconds } = run.results;
  if (!run.practice && neumesPerMinute !== null) {
    const key = bestKey(run.drillId, run.length);
    const old = bests[key];
    const better =
      !old ||
      neumesPerMinute > old.neumesPerMinute ||
      (neumesPerMinute === old.neumesPerMinute && accuracyPercent > old.accuracyPercent);
    if (better) {
      bests[key] = { neumesPerMinute, accuracyPercent, totalSeconds, date: run.date };
      newBest = true;
    }
  }
  return { progress: { ...p, bests, neumes }, newBest };
}

/** All-time weakest neumes: error rate desc, then errors desc, then id. Needs `minAttempts` and an error. */
export function weakest(
  neumes: Readonly<Record<string, NeumeTally>>,
  n: number,
  minAttempts: number,
  /** If given, ids outside this set are dropped before ranking, so they cannot use up the top `n`. */
  known?: ReadonlySet<string>,
): { id: string; attempts: number; errors: number; rate: number }[] {
  return Object.entries(neumes)
    .filter(([id, t]) => (!known || known.has(id)) && t.attempts >= minAttempts && t.errors > 0)
    .map(([id, t]) => ({ id, attempts: t.attempts, errors: t.errors, rate: t.errors / t.attempts }))
    .sort((a, b) => b.rate - a.rate || b.errors - a.errors || a.id.localeCompare(b.id))
    .slice(0, n);
}
