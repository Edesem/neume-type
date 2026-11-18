import {
  emptyProgress,
  parseProgress,
  recordRun,
  serializeProgress,
  STORAGE_KEY,
  withSettings,
  type Progress,
  type RunSummary,
  type Settings,
} from '../core/progress';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface ProgressSnapshot {
  progress: Progress;
  /** The last recorded run: whether it set a best, and for which `drill:length` key. */
  lastRun: { newBest: boolean; key: string } | null;
}

/** Run `fn`, returning `fallback` if it throws (no storage, private mode, quota). */
function safely<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/**
 * The only place that touches browser storage. A missing or throwing storage never breaks the game:
 * progress then lives in memory only. A stored version newer than this code is never overwritten.
 */
export function createProgressStore(storage: StorageLike | null, now: () => string) {
  const listeners = new Set<() => void>();

  const text = storage ? safely(() => storage.getItem(STORAGE_KEY), null) : null;
  const loaded = parseProgress(text);
  if (loaded.corrupt && storage && text !== null) {
    safely(() => storage.setItem(`${STORAGE_KEY}.corrupt`, text), undefined);
  }
  let writable = loaded.writable;
  let snapshot: ProgressSnapshot = { progress: loaded.progress, lastRun: null };

  const persist = () => {
    if (storage && writable) safely(() => storage.setItem(STORAGE_KEY, serializeProgress(snapshot.progress)), undefined);
  };
  const publish = (next: ProgressSnapshot) => {
    snapshot = next;
    persist();
    listeners.forEach((l) => l());
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    record(run: Omit<RunSummary, 'date'>) {
      const { progress, newBest } = recordRun(snapshot.progress, { ...run, date: now() });
      publish({ progress, lastRun: { newBest, key: `${run.drillId}:${run.length}` } });
    },
    saveSettings(settings: Settings) {
      publish({ ...snapshot, progress: withSettings(snapshot.progress, settings) });
    },
    /** Forget everything saved, including data from a newer version (the player asked for it). */
    reset() {
      if (storage) safely(() => storage.removeItem(STORAGE_KEY), undefined);
      writable = true;
      snapshot = { progress: emptyProgress(), lastRun: null };
      listeners.forEach((l) => l());
    },
  };
}

export type ProgressStore = ReturnType<typeof createProgressStore>;
