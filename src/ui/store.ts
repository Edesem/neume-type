import type { KeyEventLike } from '../core/chord';
import { createSession, type SessionOptions, type SessionState } from '../core/session';

export interface Snapshot {
  state: SessionState;
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
export function createGameStore(options: SessionOptions) {
  const session = createSession(options);
  const listeners = new Set<() => void>();
  let snapshot: Snapshot = { state: session.state() };

  const publish = () => {
    snapshot = { state: session.state() };
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
      publish();
    },
    /** Attach once per page. Returns a detach function. */
    attach(win: EventTarget, doc: EventTarget = win) {
      const onDown = (ev: Event) => {
        const e = ev as KeyboardEventLike;
        const result = session.handle(toEvent('down', e));
        if (result.preventDefault) e.preventDefault();
        if (result.kind === 'attempt') publish(); // only attempts change session state
      };
      const onUp = (ev: Event) => {
        // A lone modifier scores on release, so a keyup can produce an attempt.
        if (session.handle(toEvent('up', ev as KeyboardEventLike)).kind === 'attempt') publish();
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
