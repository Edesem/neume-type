import { describe, expect, it } from 'vitest';
import { formatResults } from './format';

describe('formatResults', () => {
  it('pads to 2, 1 and 1 decimals: 40.00 s, 30.0 per minute, 80.0%', () => {
    expect(formatResults({ totalSeconds: 40, neumesPerMinute: 30, accuracyPercent: 80 })).toEqual({
      time: '40.00',
      rate: '30.0',
      accuracy: '80.0%',
    });
  });

  it('shows 95.2% for 20 of 21', () => {
    expect(formatResults({ totalSeconds: 12.5, neumesPerMinute: 96, accuracyPercent: 95.2 }).accuracy).toBe('95.2%');
  });

  it('shows an em dash when the rate is undefined (zero-duration run)', () => {
    expect(formatResults({ totalSeconds: 0, neumesPerMinute: null, accuracyPercent: 100 })).toEqual({
      time: '0.00',
      rate: '—',
      accuracy: '100.0%',
    });
  });
});
