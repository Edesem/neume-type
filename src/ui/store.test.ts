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
    expect(store.getSnapshot().state.lastAttemptWrong).toBe(true);
    win.dispatchEvent(keyEvent('keydown', 'KeyJ').ev);
    expect(store.getSnapshot().state.lastAttemptWrong).toBe(false);
  });

  const down = (win: EventTarget, code: string, extra: object = {}) =>
    win.dispatchEvent(keyEvent('keydown', code, extra).ev);

  it('a window blur between a modifier and the trigger clears the held set', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    down(win, 'KeyS');
    win.dispatchEvent(new Event('blur'));
    down(win, 'KeyJ');
    expect(store.getSnapshot().state).toMatchObject({ attempts: 1, errors: 0 });
  });

  const fakeDoc = (visibilityState: string) => Object.assign(new EventTarget(), { visibilityState });

  it('a hidden visibilitychange clears the held set', () => {
    const store = make();
    const win = new EventTarget();
    const doc = fakeDoc('hidden');
    store.attach(win, doc);
    down(win, 'KeyS');
    doc.dispatchEvent(new Event('visibilitychange'));
    down(win, 'KeyJ');
    expect(store.getSnapshot().state.errors).toBe(0);
  });

  it('a visible visibilitychange does not clear the held set', () => {
    const store = make();
    const win = new EventTarget();
    const doc = fakeDoc('visible');
    store.attach(win, doc);
    down(win, 'KeyS');
    doc.dispatchEvent(new Event('visibilitychange'));
    down(win, 'KeyJ');
    expect(store.getSnapshot().state.errors).toBe(1);
  });

  it('a composing keydown is ignored', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    down(win, 'KeyH', { isComposing: true });
    expect(store.getSnapshot().state.attempts).toBe(0);
  });

  it('shiftKey on the event is forwarded', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    down(win, 'KeyJ', { shiftKey: true });
    expect(store.getSnapshot().state.errors).toBe(1);
  });

  it('a modifier keydown does not notify subscribers', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    let calls = 0;
    store.subscribe(() => calls++);
    const before = store.getSnapshot();
    down(win, 'KeyS');
    expect(calls).toBe(0);
    expect(store.getSnapshot()).toBe(before);
  });

  it('restart notifies once and clears lastAttemptWrong', () => {
    const store = make();
    const win = new EventTarget();
    store.attach(win);
    down(win, 'KeyH');
    expect(store.getSnapshot().state.lastAttemptWrong).toBe(true);
    let calls = 0;
    store.subscribe(() => calls++);
    store.restart();
    expect(calls).toBe(1);
    expect(store.getSnapshot().state.lastAttemptWrong).toBe(false);
  });

  it('a solo release publishes a snapshot', () => {
    const store = createGameStore({ random: () => 0, now: () => 0, soloTriggers: new Set(['KeyB']) });
    const win = new EventTarget();
    store.attach(win);
    let calls = 0;
    store.subscribe(() => calls++);
    win.dispatchEvent(keyEvent('keydown', 'KeyB').ev);
    expect(calls).toBe(0);
    win.dispatchEvent(keyEvent('keyup', 'KeyB').ev);
    expect(calls).toBe(1);
    expect(store.getSnapshot().state.attempts).toBe(1);
  });

  it('configure publishes once and applies the setting', () => {
    const store = make();
    let calls = 0;
    store.subscribe(() => calls++);
    store.configure({ showShortcuts: true });
    expect(calls).toBe(1);
    expect(store.getSnapshot().state.showShortcuts).toBe(true);
    store.configure({ drillId: 'KeyS' });
    expect(calls).toBe(2);
    expect(store.getSnapshot().state.drillId).toBe('KeyS');
  });

  it('a keydown with metaKey clears a held letter modifier', () => {
    const store = make(); // every target is J
    const win = new EventTarget();
    store.attach(win);
    down(win, 'KeyS');
    down(win, 'MetaLeft', { metaKey: true });
    win.dispatchEvent(keyEvent('keyup', 'MetaLeft').ev); // the S keyup was lost by the OS
    down(win, 'KeyJ');
    expect(store.getSnapshot().state).toMatchObject({ attempts: 1, errors: 0, index: 1 });
  });
});
