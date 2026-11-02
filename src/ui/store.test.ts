import { describe, expect, it } from 'vitest';
import { createGameStore } from './store';

function keyEvent(type: 'keydown' | 'keyup', code: string, extra: object = {}) {
  let prevented = false;
  const ev = Object.assign(new Event(type, { cancelable: true }), { code, repeat: false, ...extra });
  const original = ev.preventDefault.bind(ev);
  ev.preventDefault = () => {
    prevented = true;
    original();
  };
  return { ev, wasPrevented: () => prevented };
}

describe('game store', () => {
  const make = () => createGameStore({ random: () => 0, now: () => 0 }); // every target is J

  it('counts one key press as exactly one attempt', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    win.dispatchEvent(keyEvent('keydown', 'KeyH').ev);
    win.dispatchEvent(keyEvent('keyup', 'KeyH').ev);
    expect(store.getSnapshot().state.attempts).toBe(1);
    expect(store.getSnapshot().state.errors).toBe(1);
  });

  it('applies the preventDefault the core asks for, and only that', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    const scored = keyEvent('keydown', 'KeyJ');
    win.dispatchEvent(scored.ev);
    expect(scored.wasPrevented()).toBe(true);
    const space = keyEvent('keydown', 'Space');
    win.dispatchEvent(space.ev);
    expect(space.wasPrevented()).toBe(false);
  });

  it('stops listening after detach', () => {
    const store = make();
    const win = new EventTarget();
    const detach = store.attach(win);
    detach();
    win.dispatchEvent(keyEvent('keydown', 'KeyJ').ev);
    expect(store.getSnapshot().state.attempts).toBe(0);
  });

  it('notifies subscribers and keeps the snapshot stable between changes', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    let calls = 0;
    store.subscribe(() => calls++);
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    win.dispatchEvent(keyEvent('keydown', 'KeyJ').ev);
    expect(calls).toBe(1);
    expect(store.getSnapshot()).not.toBe(before);
  });

  it('flags the last attempt as wrong, then clears it on a correct one', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    win.dispatchEvent(keyEvent('keydown', 'KeyH').ev);
    expect(store.getSnapshot().lastWrong).toBe(true);
    win.dispatchEvent(keyEvent('keydown', 'KeyJ').ev);
    expect(store.getSnapshot().lastWrong).toBe(false);
  });
});
