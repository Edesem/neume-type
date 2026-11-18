import { describe, expect, it } from 'vitest';
import { script } from './keyScript';

const codeOf = (step: string) => (script([step])[0] as { code: string }).code;

describe('script', () => {
  it('maps punctuation, digits and letters to event codes', () => {
    expect(codeOf('↓.')).toBe('Period');
    expect(codeOf("↓'")).toBe('Quote');
    expect(codeOf('↓5')).toBe('Digit5');
    expect(codeOf('↓[')).toBe('BracketLeft');
    expect(codeOf('↓S')).toBe('KeyS');
    expect(codeOf('↓Shift')).toBe('ShiftLeft');
  });

  it('throws on an unknown key', () => {
    expect(() => script(['↓é'])).toThrow('script: unknown key "é"');
    expect(() => script(['↓Foo'])).toThrow('script: unknown key "Foo"');
  });
});
