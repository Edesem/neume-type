import { useSyncExternalStore } from 'react';
import { keymap } from '../data/keymap';
import type { GameStore } from './store';

const glyph = (codePoints: readonly number[]) => String.fromCodePoint(...codePoints);

export function App({ store }: { store: GameStore }) {
  const { state, lastWrong, lastKey } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <main>
      <h1>Neume Type</h1>
      <div data-testid="row">
        {state.targets.map((entry, i) => {
          const status = i < state.index ? 'done' : i === state.index ? 'current' : 'todo';
          return (
            <span
              key={i}
              className="neume"
              data-index={i}
              data-state={status}
              data-neume-id={status === 'current' ? entry.id : undefined}
              data-error={status === 'current' && lastWrong ? 'true' : undefined}
            >
              {glyph(entry.codePoints)}
            </span>
          );
        })}
      </div>
      {state.done && <p data-testid="done">Done</p>}
      <p>
        Errors: <span data-testid="errors">{state.errors}</span> Attempts:{' '}
        <span data-testid="attempts">{state.attempts}</span>
      </p>
      <p>
        Last key: <span data-testid="last-key">{lastKey}</span>
      </p>
      <h2>Glyphs</h2>
      <div>
        {keymap.map((e) => (
          <span key={e.id} className="neume" data-testid={`glyph-${e.id}`}>
            {glyph(e.codePoints)}
          </span>
        ))}
      </div>
    </main>
  );
}
