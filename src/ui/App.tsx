import { useSyncExternalStore } from 'react';
import { keymap } from '../data/keymap';
import { formatResults } from '../core/format';
import type { GameStore } from './store';

const glyph = (codePoints: readonly number[]) => String.fromCodePoint(...codePoints);

export function App({ store, debug = false }: { store: GameStore; debug?: boolean }) {
  const { state, lastWrong, lastKey } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <main>
      <h1>Neume Type</h1>
      {state.results ? (
        <ResultsView results={formatResults(state.results)} />
      ) : (
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
      )}
      <button
        type="button"
        data-testid="restart"
        onClick={(e) => {
          store.restart();
          e.currentTarget.blur(); // so Space cannot re-trigger the button
        }}
      >
        Restart
      </button>
      <p>
        Errors: <span data-testid="errors">{state.errors}</span> Attempts:{' '}
        <span data-testid="attempts">{state.attempts}</span>
      </p>
      {debug && (
        <>
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
        </>
      )}
    </main>
  );
}

function ResultsView({ results }: { results: { time: string; rate: string; accuracy: string } }) {
  return (
    <section data-testid="done">
      <h2>Results</h2>
      <p>
        Time: <span data-testid="result-time">{results.time}</span> s
      </p>
      <p>
        Rate: <span data-testid="result-rate">{results.rate}</span> neumes per minute
      </p>
      <p>
        Accuracy: <span data-testid="result-accuracy">{results.accuracy}</span>
      </p>
    </section>
  );
}
