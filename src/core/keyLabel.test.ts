import { describe, expect, it } from 'vitest';
import { keyLabel } from './keyLabel';

describe('keyLabel', () => {
  it('shows a letter code as the uppercase letter', () => {
    expect(keyLabel('KeyJ')).toBe('J');
  });

  it('returns other codes unchanged', () => {
    expect(keyLabel('Space')).toBe('Space');
  });
});
