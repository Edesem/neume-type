import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const boundary = 'src/core and src/data must stay free of React and the DOM (CLAUDE.md, A17).';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report', '.scratch'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['src/core/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: boundary },
            { name: 'react-dom', message: boundary },
          ],
          patterns: [
            { group: ['react/*', 'react-dom/*'], message: boundary },
            { group: ['**/ui', '**/ui/*', '**/ui/**'], message: boundary },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'fetch', 'performance'].map(
          (name) => ({ name, message: boundary }),
        ),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Inject randomness (createSession({ random })).' },
        { object: 'Date', property: 'now', message: 'Inject the clock (createSession({ now })).' },
      ],
    },
  },
);
