import { describe, expect, it } from 'vitest';
import {
  bestKey,
  emptyProgress,
  parseProgress,
  PROGRESS_VERSION,
  recordRun,
  serializeProgress,
  withSettings,
  weakest,
  type Progress,
  type RunSummary,
} from './progress';

const run = (over: Partial<RunSummary> = {}): RunSummary => ({
  drillId: 'all',
  length: 20,
  practice: false,
  results: { totalSeconds: 40, neumesPerMinute: 30, accuracyPercent: 80 },
  tallies: { ison: { attempts: 3, errors: 1 } },
  date: '2026-11-18T10:00:00.000Z',
  ...over,
});

describe('parseProgress', () => {
  it('null gives empty progress, writable', () => {
    expect(parseProgress(null)).toEqual({ progress: emptyProgress(), writable: true, corrupt: false });
  });

  it('invalid JSON gives empty, writable, corrupt', () => {
    expect(parseProgress('{')).toEqual({ progress: emptyProgress(), writable: true, corrupt: true });
  });

  it('a wrong shape gives empty, writable, corrupt', () => {
    for (const text of ['[]', '42', 'null', '{"version":1}', '{"version":1,"settings":{},"bests":{},"neumes":{}}']) {
      const r = parseProgress(text);
      expect(r.corrupt, text).toBe(true);
      expect(r.progress).toEqual(emptyProgress());
      expect(r.writable).toBe(true);
    }
  });

  it('a future version gives empty, not writable, not corrupt', () => {
    const text = JSON.stringify({ version: PROGRESS_VERSION + 1, anything: true });
    expect(parseProgress(text)).toEqual({ progress: emptyProgress(), writable: false, corrupt: false });
  });

  it('keeps unknown neume and drill ids', () => {
    const p: Progress = {
      ...emptyProgress(),
      neumes: { futureNeume: { attempts: 5, errors: 2 } },
      bests: { 'futureDrill:20': { neumesPerMinute: 10, accuracyPercent: 90, totalSeconds: 5, date: 'd' } },
    };
    expect(parseProgress(serializeProgress(p)).progress).toEqual(p);
  });

  it('a missing optional length is fine', () => {
    const text = JSON.stringify({
      version: 1,
      settings: { drillId: 'KeyR', showShortcuts: true },
      bests: {},
      neumes: {},
    });
    const r = parseProgress(text);
    expect(r.corrupt).toBe(false);
    expect(r.progress.settings).toEqual({ drillId: 'KeyR', showShortcuts: true });
  });

  it('serialize then parse round-trips', () => {
    const { progress } = recordRun(emptyProgress(), run());
    expect(parseProgress(serializeProgress(progress)).progress).toEqual(progress);
  });
});

describe('settings.length', () => {
  const withLength = (length: unknown) =>
    JSON.stringify({ version: 1, settings: { drillId: 'all', showShortcuts: false, length }, bests: {}, neumes: {} });

  it('round-trips', () => {
    const p = { ...emptyProgress(), settings: { drillId: 'KeyR', showShortcuts: true, length: 50 } };
    expect(parseProgress(serializeProgress(p)).progress.settings).toEqual(p.settings);
  });

  it('an invalid or unknown stored length is dropped (the default applies) and is not corruption', () => {
    for (const bad of [0, -5, 2.5, 30, 'ten', null]) {
      const r = parseProgress(withLength(bad));
      expect(r.corrupt, String(bad)).toBe(false);
      expect(r.progress.settings.length).toBeUndefined();
    }
  });

  it('withSettings merges: a patch without length keeps the stored length', () => {
    const p = { ...emptyProgress(), settings: { drillId: 'all', showShortcuts: false, length: 10 } };
    expect(withSettings(p, { drillId: 'KeyR' }).settings).toEqual({ drillId: 'KeyR', showShortcuts: false, length: 10 });
  });
});

describe('settings.noRepeats', () => {
  const withValue = (noRepeats: unknown) =>
    JSON.stringify({
      version: 1,
      settings: { drillId: 'KeyR', showShortcuts: true, length: 10, noRepeats },
      bests: {},
      neumes: {},
    });

  it('round-trips true', () => {
    const p = { ...emptyProgress(), settings: { drillId: 'all', showShortcuts: false, noRepeats: true } };
    expect(parseProgress(serializeProgress(p)).progress.settings.noRepeats).toBe(true);
  });

  it('absent means off: the empty settings have no key', () => {
    expect('noRepeats' in emptyProgress().settings).toBe(false);
  });

  it('a non-boolean stored value is dropped, not corrupt, and the other settings are kept', () => {
    for (const bad of ['yes', 1, null, {}]) {
      const r = parseProgress(withValue(bad));
      expect(r.corrupt, String(bad)).toBe(false);
      expect(r.progress.settings.noRepeats).toBeUndefined();
      expect(r.progress.settings).toEqual({ drillId: 'KeyR', showShortcuts: true, length: 10 });
    }
  });

  it('a stored false is kept', () => {
    expect(parseProgress(withValue(false)).progress.settings.noRepeats).toBe(false);
  });

  it('withSettings merges noRepeats and keeps length and drill', () => {
    const p = { ...emptyProgress(), settings: { drillId: 'KeyR', showShortcuts: false, length: 50 } };
    expect(withSettings(p, { noRepeats: true }).settings).toEqual({
      drillId: 'KeyR', showShortcuts: false, length: 50, noRepeats: true,
    });
  });
});

describe('recordRun', () => {
  it('adds tallies to all-time totals', () => {
    const a = recordRun(emptyProgress(), run()).progress;
    const b = recordRun(a, run({ tallies: { ison: { attempts: 2, errors: 2 }, oligon: { attempts: 1, errors: 0 } } })).progress;
    expect(b.neumes).toEqual({ ison: { attempts: 5, errors: 3 }, oligon: { attempts: 1, errors: 0 } });
  });

  it('the first non-practice run sets the best and newBest', () => {
    const r = recordRun(emptyProgress(), run());
    expect(r.newBest).toBe(true);
    expect(r.progress.bests[bestKey('all', 20)]).toEqual({
      neumesPerMinute: 30,
      accuracyPercent: 80,
      totalSeconds: 40,
      date: '2026-11-18T10:00:00.000Z',
    });
  });

  it('a slower run keeps the old best', () => {
    const a = recordRun(emptyProgress(), run()).progress;
    const b = recordRun(a, run({ results: { totalSeconds: 60, neumesPerMinute: 20, accuracyPercent: 100 } }));
    expect(b.newBest).toBe(false);
    expect(b.progress.bests[bestKey('all', 20)].neumesPerMinute).toBe(30);
  });

  it('a tie on rate goes to the higher accuracy', () => {
    const a = recordRun(emptyProgress(), run()).progress;
    const better = recordRun(a, run({ results: { totalSeconds: 40, neumesPerMinute: 30, accuracyPercent: 95 } }));
    expect(better.newBest).toBe(true);
    expect(better.progress.bests[bestKey('all', 20)].accuracyPercent).toBe(95);
    const worse = recordRun(a, run({ results: { totalSeconds: 40, neumesPerMinute: 30, accuracyPercent: 70 } }));
    expect(worse.newBest).toBe(false);
  });

  it('a practice run never sets a best but adds tallies', () => {
    const r = recordRun(emptyProgress(), run({ practice: true }));
    expect(r.newBest).toBe(false);
    expect(r.progress.bests).toEqual({});
    expect(r.progress.neumes.ison).toEqual({ attempts: 3, errors: 1 });
  });

  it('a null rate never sets a best', () => {
    const r = recordRun(emptyProgress(), run({ results: { totalSeconds: 0, neumesPerMinute: null, accuracyPercent: 100 } }));
    expect(r.newBest).toBe(false);
    expect(r.progress.bests).toEqual({});
  });

  it('bests are per drill and length', () => {
    let p = recordRun(emptyProgress(), run()).progress;
    p = recordRun(p, run({ drillId: 'KeyR' })).progress;
    p = recordRun(p, run({ length: 10 })).progress;
    expect(Object.keys(p.bests).sort()).toEqual(['KeyR:20', 'all:10', 'all:20']);
  });

  it('does not mutate its input', () => {
    const before = recordRun(emptyProgress(), run()).progress;
    const copy = JSON.parse(JSON.stringify(before));
    recordRun(before, run({ tallies: { ison: { attempts: 9, errors: 9 } }, results: { totalSeconds: 1, neumesPerMinute: 99, accuracyPercent: 100 } }));
    expect(before).toEqual(copy);
  });

  it('throws on a negative tally', () => {
    expect(() => recordRun(emptyProgress(), run({ tallies: { ison: { attempts: -1, errors: 0 } } }))).toThrow();
  });
});

describe('weakest', () => {
  it('ignores ids that are not known before ranking and capping', () => {
    const neumes = {
      gone1: { attempts: 10, errors: 10 },
      gone2: { attempts: 10, errors: 9 },
      real: { attempts: 10, errors: 1 },
    };
    const known = new Set(['real']);
    expect(weakest(neumes, 1, 3, known).map((w) => w.id)).toEqual(['real']);
  });

  it('needs the minimum attempts, at least one error, and ranks by error rate', () => {
    const neumes = {
      a: { attempts: 10, errors: 5 }, // 0.5
      b: { attempts: 4, errors: 3 }, // 0.75
      c: { attempts: 2, errors: 2 }, // too few attempts
      d: { attempts: 9, errors: 0 }, // no errors
      e: { attempts: 3, errors: 1 }, // 0.33
    };
    expect(weakest(neumes, 5, 3).map((w) => w.id)).toEqual(['b', 'a', 'e']);
  });

  it('breaks ties by errors, then id, and caps at n', () => {
    const neumes = {
      z: { attempts: 4, errors: 2 },
      y: { attempts: 4, errors: 2 },
      x: { attempts: 8, errors: 4 },
    };
    expect(weakest(neumes, 2, 3).map((w) => w.id)).toEqual(['x', 'y']);
  });
});
