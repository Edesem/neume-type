import { useSyncExternalStore } from 'react';
import { keymap } from '../data/keymap';
import { drills } from '../core/drills';
import { formatResults, type FormattedResults } from '../core/format';
import { hardest, type Tallies } from '../core/stats';
import { shortcutText } from '../core/shortcut';
import type { GameStore } from './store';

const allDrills = drills();
const blurAfter = (e: { currentTarget: HTMLElement }) => e.currentTarget.blur(); // so Space cannot re-trigger it

const glyph = (codePoints: readonly number[]) => String.fromCodePoint(...codePoints);

export function App({ store, debug = false }: { store: GameStore; debug?: boolean }) {
  const { state } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <main>
      <h1>Neume Type</h1>
      <nav className="settings" aria-label="Practice options">
        <span>drill</span>
        {allDrills.map((d) => (
          <button
            key={d.id}
            type="button"
            data-testid={`drill-${d.id}`}
            aria-pressed={state.drillId === d.id}
            title={d.title}
            onClick={(e) => {
              store.configure({ drillId: d.id });
              blurAfter(e);
            }}
          >
            {d.label}
          </button>
        ))}
        <span>shortcuts</span>
        <button
          type="button"
          data-testid="show-shortcuts"
          aria-pressed={state.showShortcuts}
          onClick={(e) => {
            store.configure({ showShortcuts: !state.showShortcuts });
            blurAfter(e);
          }}
        >
          show
        </button>
      </nav>
      {state.results ? (
        <ResultsView results={formatResults(state.results)} tallies={state.tallies} />
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
      {state.hintVisible && (
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

function ResultsView({ results, tallies }: { results: FormattedResults; tallies: Tallies }) {
  const worst = hardest(tallies, 3);
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
      <h3>Hardest this run</h3>
      {worst.length === 0 ? (
        <p data-testid="no-errors">No errors</p>
      ) : (
        <ol className="hardest" data-testid="hardest">
          {worst.map((w) => {
            const entry = keymap.find((e) => e.id === w.id)!;
            return (
              <li key={w.id} data-neume-id={w.id}>
                <span className="neume">{glyph(entry.codePoints)}</span> {entry.name}: {shortcutText(entry)} (
                {w.errors} {w.errors === 1 ? 'error' : 'errors'})
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
