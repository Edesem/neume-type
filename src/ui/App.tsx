import { useSyncExternalStore } from 'react';
import { keymap } from '../data/keymap';
import { formatResults, type FormattedResults } from '../core/format';
import { shortcutText } from '../core/shortcut';
import type { GameStore } from './store';

const glyph = (codePoints: readonly number[]) => String.fromCodePoint(...codePoints);

export function App({ store, debug = false }: { store: GameStore; debug?: boolean }) {
  const { state } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <main>
      <h1>Neume Type</h1>
      {state.results ? (
        <ResultsView results={formatResults(state.results)} />
      ) : (
        <div className="neume-row" data-testid="row">
          {state.targets.map((entry, i) => {
            const status = i < state.index ? 'done' : i === state.index ? 'current' : 'todo';
            return (
              <span
                key={i}
                className="neume"
                data-index={i}
                data-state={status}
                data-neume-id={status === 'current' ? entry.id : undefined}
                data-error={status === 'current' && state.lastAttemptWrong ? 'true' : undefined}
              >
                {glyph(entry.codePoints)}
              </span>
            );
          })}
        </div>
      )}
      {state.lastAttemptWrong && !state.done && (
        <p className="hint" data-testid="hint">
          {state.targets[state.index].name}: {shortcutText(state.targets[state.index])}
        </p>
      )}
      <button
        type="button"
        className="restart"
        data-testid="restart"
        onClick={(e) => {
          store.restart();
          e.currentTarget.blur(); // so Space cannot re-trigger the button
        }}
      >
        Restart
      </button>
      <p className="stats">
        Errors: <span data-testid="errors">{state.errors}</span> Attempts:{' '}
        <span data-testid="attempts">{state.attempts}</span>
      </p>
      {debug && (
        <>
          <h2>Glyphs</h2>
          <div className="glyph-reference">
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

function ResultsView({ results }: { results: FormattedResults }) {
  return (
    <section className="results" data-testid="done">
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
