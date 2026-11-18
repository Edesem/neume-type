import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_DRILL_ID, drills } from './core/drills';
import { seededRandom } from './core/random';
import { App } from './ui/App';
import { createProgressStore } from './ui/progressStore';
import { createGameStore } from './ui/store';
import './ui/fonts.css';
import './ui/look.css';

// ?seed=N makes the draw repeatable (used by Playwright).
const seed = new URLSearchParams(window.location.search).get('seed');

// Browser storage can be missing or throw (private mode); the progress store then keeps memory only.
const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
})();
const progress = createProgressStore(storage, () => new Date().toISOString());
const saved = progress.getSnapshot().progress.settings;

const store = createGameStore({
  random: seed === null ? Math.random : seededRandom(Number(seed)),
  now: () => performance.now(),
  // A stored drill that no longer exists falls back to the default.
  drillId: drills().some((d) => d.id === saved.drillId) ? saved.drillId : DEFAULT_DRILL_ID,
  showShortcuts: saved.showShortcuts,
  onComplete: (run) => progress.record(run),
  onConfigure: (settings) => progress.saveSettings(settings),
});
// Attached once, outside React, so re-renders and StrictMode cannot double-count a key press.
store.attach(window, document);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} progress={progress} debug={new URLSearchParams(window.location.search).has('debug')} />
  </StrictMode>,
);
