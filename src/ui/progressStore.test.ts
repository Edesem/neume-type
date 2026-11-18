import { describe, expect, it } from 'vitest';
import { PROGRESS_VERSION, STORAGE_KEY, bestKey, type RunSummary } from '../core/progress';
import { createProgressStore } from './progressStore';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

const run = (over: Partial<Omit<RunSummary, 'date'>> = {}): Omit<RunSummary, 'date'> => ({
  drillId: 'all',
  length: 20,
  practice: false,
  results: { totalSeconds: 40, neumesPerMinute: 30, accuracyPercent: 80 },
  tallies: { ison: { attempts: 3, errors: 1 } },
  ...over,
});
const now = () => '2026-11-18T10:00:00.000Z';

describe('progress store', () => {
  it('loads stored progress', () => {
    const storage = fakeStorage();
    const first = createProgressStore(storage, now);
    first.record(run());
    const second = createProgressStore(storage, now);
    expect(second.getSnapshot().progress.neumes.ison).toEqual({ attempts: 3, errors: 1 });
  });

  it('record writes JSON under the key and notifies', () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage, now);
    let calls = 0;
    store.subscribe(() => calls++);
    store.record(run());
    expect(calls).toBe(1);
    const saved = JSON.parse(storage.map.get(STORAGE_KEY)!);
    expect(saved.version).toBe(PROGRESS_VERSION);
    expect(saved.bests[bestKey('all', 20)].date).toBe(now());
    expect(store.getSnapshot().lastRun).toEqual({ newBest: true, key: bestKey('all', 20) });
  });

  it('saveSettings persists the settings', () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage, now);
    store.saveSettings({ drillId: 'KeyR', showShortcuts: true });
    expect(createProgressStore(storage, now).getSnapshot().progress.settings).toEqual({ drillId: 'KeyR', showShortcuts: true });
  });

  it('a throwing storage falls back to memory without throwing', () => {
    const boom = () => {
      throw new Error('denied');
    };
    const storage = { getItem: boom, setItem: boom, removeItem: boom };
    const store = createProgressStore(storage, now);
    expect(() => store.record(run())).not.toThrow();
    expect(() => store.saveSettings({ drillId: 'all', showShortcuts: false })).not.toThrow();
    expect(() => store.reset()).not.toThrow();
    const again = createProgressStore(storage, now);
    again.record(run());
    expect(again.getSnapshot().progress.neumes.ison).toEqual({ attempts: 3, errors: 1 });
  });

  it('a null storage works in memory', () => {
    const store = createProgressStore(null, now);
    store.record(run());
    expect(store.getSnapshot().progress.neumes.ison).toEqual({ attempts: 3, errors: 1 });
  });

  it('a future version is never overwritten', () => {
    const future = JSON.stringify({ version: PROGRESS_VERSION + 1, keep: 'me' });
    const storage = fakeStorage({ [STORAGE_KEY]: future });
    const store = createProgressStore(storage, now);
    store.record(run());
    store.saveSettings({ drillId: 'KeyR', showShortcuts: false });
    expect(storage.map.get(STORAGE_KEY)).toBe(future);
    expect(store.getSnapshot().progress.neumes.ison).toEqual({ attempts: 3, errors: 1 }); // memory still works
  });

  it('corrupt text is copied to the .corrupt key and the game starts empty and writable', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{oops' });
    const store = createProgressStore(storage, now);
    expect(storage.map.get(`${STORAGE_KEY}.corrupt`)).toBe('{oops');
    expect(store.getSnapshot().progress.neumes).toEqual({});
    store.record(run());
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!).version).toBe(PROGRESS_VERSION);
    expect(storage.map.get(`${STORAGE_KEY}.corrupt`)).toBe('{oops');
  });

  it('saveSettings merges, so a drill change keeps the saved length', () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage, now);
    store.saveSettings({ length: 50 });
    store.saveSettings({ drillId: 'KeyR', showShortcuts: true });
    const reloaded = createProgressStore(storage, now);
    expect(reloaded.getSnapshot().progress.settings).toEqual({ drillId: 'KeyR', showShortcuts: true, length: 50 });
  });

  it('saveSettings({ noRepeats }) merges and survives a reload', () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage, now);
    store.saveSettings({ drillId: 'KeyR', showShortcuts: false, length: 10 });
    store.saveSettings({ noRepeats: true });
    const reloaded = createProgressStore(storage, now);
    expect(reloaded.getSnapshot().progress.settings).toEqual({
      drillId: 'KeyR', showShortcuts: false, length: 10, noRepeats: true,
    });
  });

  it('reset keeps the live settings, in memory and in storage', () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage, now);
    store.saveSettings({ drillId: 'KeyR', showShortcuts: true });
    store.record(run());
    store.reset();
    expect(store.getSnapshot().progress.settings).toEqual({ drillId: 'KeyR', showShortcuts: true });
    expect(store.getSnapshot().progress.neumes).toEqual({});
    const reloaded = createProgressStore(storage, now);
    expect(reloaded.getSnapshot().progress.settings).toEqual({ drillId: 'KeyR', showShortcuts: true });
    expect(reloaded.getSnapshot().progress.bests).toEqual({});
  });

  it('reset removes the key and empties the snapshot', () => {
    const storage = fakeStorage();
    const store = createProgressStore(storage, now);
    store.record(run());
    store.reset();
    expect(storage.map.has(STORAGE_KEY)).toBe(false);
    expect(store.getSnapshot().progress.neumes).toEqual({});
    expect(store.getSnapshot().lastRun).toBeNull();
  });
});
