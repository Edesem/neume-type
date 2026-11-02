import { useEffect, useState } from 'react';
import { keyLabel } from '../core/keyLabel';
import { keymap } from '../data/keymap';

export function App() {
  const [last, setLast] = useState('none');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => setLast(keyLabel(e.code));
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main>
      <h1>Neume Type</h1>
      <p>
        Last key: <span data-testid="last-key">{last}</span>
      </p>
      <div>
        {keymap.map((e) => (
          <span key={e.id} className="neume" data-testid={`glyph-${e.id}`}>
            {String.fromCodePoint(...e.codePoints)}
          </span>
        ))}
      </div>
    </main>
  );
}
