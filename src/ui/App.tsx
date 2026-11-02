import { useEffect, useState } from 'react';
import { keyLabel } from '../core/keyLabel';

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
      <span className="neume" data-testid="glyph-probe">
        {"\uE000"}
      </span>
    </main>
  );
}
