import { describe, expect, it } from 'vitest';
import { hardest } from './stats';

describe('hardest', () => {
  it('ignores zero-error neumes', () => {
    expect(hardest({ a: { attempts: 5, errors: 0 }, b: { attempts: 2, errors: 1 } }, 3)).toEqual([
      { id: 'b', attempts: 2, errors: 1 },
    ]);
  });

  it('sorts by errors, then attempts, then id', () => {
    const t = {
      c: { attempts: 3, errors: 1 },
      a: { attempts: 3, errors: 1 },
      d: { attempts: 9, errors: 1 },
      e: { attempts: 4, errors: 2 },
    };
    expect(hardest(t, 10).map((x) => x.id)).toEqual(['e', 'd', 'a', 'c']);
  });

  it('caps at n', () => {
    const t = { a: { attempts: 1, errors: 1 }, b: { attempts: 1, errors: 1 }, c: { attempts: 1, errors: 1 } };
    expect(hardest(t, 2)).toHaveLength(2);
  });

  it('returns an empty list when there are no errors', () => {
    expect(hardest({}, 3)).toEqual([]);
  });
});
