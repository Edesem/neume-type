import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { seededRandom } from './core/random';
import { App } from './ui/App';
import { createGameStore } from './ui/store';
import './ui/fonts.css';
import './ui/look.css';

// ?seed=N makes the draw repeatable (used by Playwright).
const seed = new URLSearchParams(window.location.search).get('seed');
const store = createGameStore({
  random: seed === null ? Math.random : seededRandom(Number(seed)),
  now: () => performance.now(),
});
// Attached once, outside React, so re-renders and StrictMode cannot double-count a key press.
store.attach(window, document);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App store={store} debug={new URLSearchParams(window.location.search).has('debug')} />
  </StrictMode>,
);
