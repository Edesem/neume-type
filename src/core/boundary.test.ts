import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
const eslint = new ESLint({ cwd });

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${cwd}${filePath}` });
  return result.messages.map((m) => m.ruleId ?? 'parse-error');
}

describe('core and data boundary (A17)', () => {
  it('rejects a react import in src/core', async () => {
    const ids = await ruleIds("import { useState } from 'react';\nexport const x = useState;\n", 'src/core/__probe.ts');
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects a src/ui import in src/data', async () => {
    const ids = await ruleIds("import { App } from '../ui/App';\nexport const x = App;\n", 'src/data/__probe.ts');
    expect(ids).toContain('no-restricted-imports');
  });

  it('rejects window and document in src/core', async () => {
    const [result] = await eslint.lintText('export const a = window;\nexport const b = document;\n', {
      filePath: `${cwd}src/core/__probe.ts`,
    });
    const flagged = result.messages.filter((m) => m.ruleId === 'no-restricted-globals');
    expect(flagged.length).toBe(2);
  });

  it('rejects Math.random and Date.now in src/core', async () => {
    const [result] = await eslint.lintText('export const a = Math.random();\nexport const b = Date.now();\n', {
      filePath: `${cwd}src/core/__probe.ts`,
    });
    const flagged = result.messages.filter((m) => m.ruleId === 'no-restricted-properties');
    expect(flagged.length).toBe(2);
  });

  it('allows the same react import in src/ui', async () => {
    const ids = await ruleIds("import { useState } from 'react';\nexport const x = useState;\n", 'src/ui/__probe.tsx');
    expect(ids).not.toContain('no-restricted-imports');
  });
});
