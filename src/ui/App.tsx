import { useSyncExternalStore } from 'react';
import { keymap } from '../data/keymap';
import { drills } from '../core/drills';
import { LENGTH_OPTIONS } from '../core/session';
import { formatResults, type FormattedResults } from '../core/format';
import { hardest, type Tallies } from '../core/stats';
import { bestKey, weakest } from '../core/progress';
import { shortcutText } from '../core/shortcut';
import type { ProgressStore } from './progressStore';
import type { GameStore } from './store';

const allDrills = drills();
const knownIds: ReadonlySet<string> = new Set(keymap.map((e) => e.id));
const blurAfter = (e: { currentTarget: HTMLElement }) => e.currentTarget.blur(); // so Space cannot re-trigger it

const glyph = (codePoints: readonly number[]) => String.fromCodePoint(...codePoints);

export function App({ store, progress, debug = false }: { store: GameStore; progress: ProgressStore; debug?: boolean }) {
  const { state } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const saved = useSyncExternalStore(progress.subscribe, progress.getSnapshot);
  const key = bestKey(state.drillId, state.targets.length);
  const best = saved.progress.bests[key];
  const weakNeumes = weakest(saved.progress.neumes, 5, 3, knownIds);

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
        <span>length</span>
        {LENGTH_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            data-testid={`length-${n}`}
            aria-pressed={state.length === n}
            onClick={(e) => {
              store.configure({ length: n });
              blurAfter(e);
            }}
          >
            {n}
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
        <span>repeats</span>
        <button
          type="button"
          data-testid="no-repeats"
          aria-pressed={state.noRepeats}
          title="Never the same neume twice in a row"
          onClick={(e) => {
            store.configure({ noRepeats: !state.noRepeats });
            blurAfter(e);
          }}
        >
          avoid
        </button>
      </nav>
      {state.results ? (
        <ResultsView
          results={formatResults(state.results)}
          tallies={state.tallies}
          bestRate={best ? best.neumesPerMinute.toFixed(1) : null}
          newBest={saved.lastRun?.newBest === true && saved.lastRun.key === key}
        />
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
      {weakNeumes.length > 0 && (
        <section className="weakest" data-testid="weakest">
          <h2>Weakest neumes</h2>
          <ol>
            {weakNeumes.map((w) => {
              const entry = keymap.find((e) => e.id === w.id)!;
              return (
                <li key={w.id} data-neume-id={w.id}>
                  <span className="neume">{glyph(entry.codePoints)}</span> {entry.name}: {shortcutText(entry)} (
                  {Math.round(w.rate * 100)}% errors)
                </li>
              );
            })}
          </ol>
        </section>
      )}
      <button
        type="button"
        className="reset-progress"
        data-testid="reset-progress"
        onClick={(e) => {
          if (window.confirm('Reset saved progress? This cannot be undone.')) progress.reset();
          e.currentTarget.blur();
        }}
      >
        Reset saved progress
      </button>
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

function ResultsView({
  results,
  tallies,
  bestRate,
  newBest,
}: {
  results: FormattedResults;
  tallies: Tallies;
  bestRate: string | null;
  newBest: boolean;
}) {
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
      {bestRate !== null && (
        <p>
          Best (this drill and length): <span data-testid="best-rate">{bestRate}</span> per minute
          {newBest && <strong data-testid="new-best"> New best</strong>}
        </p>
      )}
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
