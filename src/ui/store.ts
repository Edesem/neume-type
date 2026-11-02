import { keyLabel } from '../core/keyLabel';
import type { KeyEventLike } from '../core/chord';
import { createSession, type SessionState } from '../core/session';

export interface Snapshot {
  state: SessionState;
  lastWrong: boolean;
  lastKey: string;
}

interface KeyboardEventLike extends Event {
  code: string;
  repeat: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}

/**
 * Holds the one session and tracker for the page. Thin glue: it forwards events to core,
 * applies the returned preventDefault, and exposes a snapshot for React.
 */
export function createGameStore(options: { random: () => number; now: () => number }) {
  const session = createSession(options);
  const listeners = new Set<() => void>();
  let snapshot: Snapshot = { state: session.state(), lastWrong: false, lastKey: 'none' };

  const publish = (patch: Partial<Snapshot>) => {
    snapshot = { ...snapshot, state: session.state(), ...patch };
    listeners.forEach((l) => l());
  };

  const toEvent = (type: 'down' | 'up', e: KeyboardEventLike): KeyEventLike => ({
    type,
    code: e.code,
    repeat: e.repeat,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    isComposing: e.isComposing,
  });

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    restart() {
      session.restart();
      publish({ lastWrong: false });
    },
    /** Attach once per page. Returns a detach function. */
    attach(win: EventTarget, doc: EventTarget = win) {
      const onDown = (ev: Event) => {
        const e = ev as KeyboardEventLike;
        const errorsBefore = session.state().errors;
        const result = session.handle(toEvent('down', e));
        if (result.preventDefault) e.preventDefault();
        if (result.kind === 'attempt') {
          publish({
            lastWrong: session.state().errors > errorsBefore,
            lastKey: keyLabel(e.code),
          });
        } else {
          publish({ lastKey: keyLabel(e.code) });
        }
      };
      const onUp = (ev: Event) => {
        session.handle(toEvent('up', ev as KeyboardEventLike));
      };
      const onBlur = () => session.blur();
      const onVisibility = () => {
        if ((doc as Document).visibilityState === 'hidden') session.blur();
      };
      win.addEventListener('keydown', onDown);
      win.addEventListener('keyup', onUp);
      win.addEventListener('blur', onBlur);
      doc.addEventListener('visibilitychange', onVisibility);
      return () => {
        win.removeEventListener('keydown', onDown);
        win.removeEventListener('keyup', onUp);
        win.removeEventListener('blur', onBlur);
        doc.removeEventListener('visibilitychange', onVisibility);
      };
    },
  };
}

export type GameStore = ReturnType<typeof createGameStore>;
