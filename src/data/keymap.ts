export type Status = 'verified' | 'unverified';

/** common and uncommon feed the weighted draw; fixed is for Rest, Cross and Breath. */
export type Frequency = 'common' | 'uncommon' | 'fixed';

export interface KeymapEntry {
  id: string;
  name: string;
  /** event.code values of modifiers; 'Shift' means ShiftLeft or ShiftRight. */
  modifiers: readonly string[];
  /** event.code of the scored key. */
  trigger: string;
  codePoints: readonly number[];
  status: Status;
  /** Pitch change in steps from the previous note; null for Rest, Cross and Breath. */
  pitch: number | null;
  frequency: Frequency;
}

export const MODIFIERS: readonly string[] = [
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD',
  'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'Shift',
];

// Transcribed from SPEC Appendix A, in table order.
export const keymap: readonly KeymapEntry[] = [
  { id: "ison", name: "Ison", modifiers: [], trigger: 'KeyJ', codePoints: [0xE000], status: 'verified', pitch: 0, frequency: 'common' },
  { id: "oligon", name: "Oligon", modifiers: [], trigger: 'KeyK', codePoints: [0xE001], status: 'verified', pitch: 1, frequency: 'common' },
  { id: "oligonKentimaBelow", name: "Oligon with Kentēma (below)", modifiers: [], trigger: 'KeyL', codePoints: [0xE003], status: 'verified', pitch: 2, frequency: 'common' },
  { id: "oligonKentimaMiddle", name: "Oligon with Kentēma", modifiers: ['KeyS'], trigger: 'KeyL', codePoints: [0xE002], status: 'verified', pitch: 2, frequency: 'common' },
  { id: "oligonKentimaAbove", name: "Oligon with Kentēma (above)", modifiers: [], trigger: 'Semicolon', codePoints: [0xE004], status: 'verified', pitch: 3, frequency: 'common' },
  { id: "oligonYpsiliRight", name: "Oligon with Ypsēlē (right)", modifiers: [], trigger: 'Quote', codePoints: [0xE005], status: 'verified', pitch: 4, frequency: 'common' },
  { id: "oligonYpsiliLeft", name: "Oligon with Ypsēlē (left)", modifiers: [], trigger: 'KeyU', codePoints: [0xE006], status: 'verified', pitch: 5, frequency: 'uncommon' },
  { id: "oligonKentimaYpsiliRight", name: "Oligon with Ypsēlē and Kentēma (horizontal)", modifiers: [], trigger: 'KeyI', codePoints: [0xE007], status: 'verified', pitch: 6, frequency: 'uncommon' },
  { id: "oligonKentimaYpsiliMiddle", name: "Oligon with Ypsēlē and Kentēma (vertical)", modifiers: [], trigger: 'KeyO', codePoints: [0xE008], status: 'verified', pitch: 7, frequency: 'uncommon' },
  { id: "oligonDoubleYpsili", name: "Oligon with Double Ypsēlē", modifiers: [], trigger: 'KeyP', codePoints: [0xE009], status: 'verified', pitch: 8, frequency: 'uncommon' },
  { id: "petastiIson", name: "Petastē with Ison", modifiers: ['Shift'], trigger: 'KeyJ', codePoints: [0xE040], status: 'verified', pitch: 0, frequency: 'uncommon' },
  { id: "petasti", name: "Petastē", modifiers: ['Shift'], trigger: 'KeyK', codePoints: [0xE041], status: 'verified', pitch: 1, frequency: 'common' },
  { id: "petastiOligon", name: "Petastē with Oligon", modifiers: ['Shift'], trigger: 'KeyL', codePoints: [0xE042], status: 'verified', pitch: 2, frequency: 'uncommon' },
  { id: "petastiKentima", name: "Petastē with Kentēma (above)", modifiers: ['Shift'], trigger: 'Semicolon', codePoints: [0xE043], status: 'verified', pitch: 3, frequency: 'uncommon' },
  { id: "petastiYpsiliRight", name: "Petastē with Ypsēlē (right)", modifiers: ['Shift'], trigger: 'Quote', codePoints: [0xE044], status: 'verified', pitch: 4, frequency: 'uncommon' },
  { id: "petastiYpsiliLeft", name: "Petastē with Ypsēlē (left)", modifiers: ['Shift'], trigger: 'KeyU', codePoints: [0xE045], status: 'verified', pitch: 5, frequency: 'uncommon' },
  { id: "petastiKentimaYpsiliRight", name: "Petastē with Ypsēlē and Kentēma (horizontal)", modifiers: ['Shift'], trigger: 'KeyI', codePoints: [0xE046], status: 'verified', pitch: 6, frequency: 'uncommon' },
  { id: "petastiKentimaYpsiliMiddle", name: "Petastē with Ypsēlē and Kentēma (vertical)", modifiers: ['Shift'], trigger: 'KeyO', codePoints: [0xE047], status: 'verified', pitch: 7, frequency: 'uncommon' },
  { id: "petastiDoubleYpsili", name: "Petastē with Double Ypsēlē", modifiers: ['Shift'], trigger: 'KeyP', codePoints: [0xE048], status: 'verified', pitch: 8, frequency: 'uncommon' },
  { id: "apostrofos", name: "Apostrophos", modifiers: [], trigger: 'KeyN', codePoints: [0xE021], status: 'verified', pitch: -1, frequency: 'common' },
  { id: "isonApostrofos", name: "Ison and Apostrophos", modifiers: ['KeyS'], trigger: 'KeyN', codePoints: [0xE020], status: 'verified', pitch: -1, frequency: 'common' },
  { id: "elafron", name: "Elaphron", modifiers: [], trigger: 'KeyM', codePoints: [0xE024], status: 'verified', pitch: -2, frequency: 'common' },
  { id: "runningElafron", name: "Running Elaphron", modifiers: ['KeyF'], trigger: 'KeyM', codePoints: [0xE025], status: 'verified', pitch: -3, frequency: 'common' },
  { id: "yporroi", name: "Yporroē", modifiers: ['KeyD'], trigger: 'KeyM', codePoints: [0xE023], status: 'verified', pitch: -2, frequency: 'common' },
  { id: "apostrofosSyndesmos", name: "Double Apostrophos", modifiers: ['KeyS'], trigger: 'KeyM', codePoints: [0xE022], status: 'verified', pitch: -2, frequency: 'common' },
  { id: "elafronApostrofos", name: "Elaphron with Apostrophos", modifiers: [], trigger: 'Comma', codePoints: [0xE026], status: 'verified', pitch: -3, frequency: 'common' },
  { id: "chamili", name: "Hamēlē", modifiers: [], trigger: 'Period', codePoints: [0xE027], status: 'verified', pitch: -4, frequency: 'common' },
  { id: "chamiliApostrofos", name: "Hamēlē with Apostrophos", modifiers: [], trigger: 'Slash', codePoints: [0xE028], status: 'verified', pitch: -5, frequency: 'uncommon' },
  { id: "chamiliElafron", name: "Hamēlē with Elaphron", modifiers: ['KeyS'], trigger: 'Slash', codePoints: [0xE029], status: 'verified', pitch: -6, frequency: 'uncommon' },
  { id: "chamiliElafronApostrofos", name: "Hamēlē with Elaphron and Apostrophos", modifiers: ['KeyD'], trigger: 'Slash', codePoints: [0xE02A], status: 'verified', pitch: -7, frequency: 'uncommon' },
  { id: "doubleChamili", name: "Double Hamēlē", modifiers: ['KeyF'], trigger: 'Slash', codePoints: [0xE02B], status: 'verified', pitch: -8, frequency: 'uncommon' },
  { id: "petastiApostrofos", name: "Petastē with Apostrophos", modifiers: ['Shift'], trigger: 'KeyN', codePoints: [0xE060], status: 'verified', pitch: -1, frequency: 'uncommon' },
  { id: "petastiElafron", name: "Petastē with Elaphron", modifiers: ['Shift'], trigger: 'KeyM', codePoints: [0xE062], status: 'verified', pitch: -2, frequency: 'uncommon' },
  { id: "petastiRunningElafron", name: "Petastē with Running Elaphron", modifiers: ['Shift', 'KeyS'], trigger: 'KeyM', codePoints: [0xE063], status: 'verified', pitch: -3, frequency: 'uncommon' },
  { id: "petastiYporroi", name: "Petastē with Yporroē", modifiers: ['Shift', 'KeyD'], trigger: 'KeyM', codePoints: [0xE061], status: 'verified', pitch: -2, frequency: 'uncommon' },
  { id: "petastiElafronApostrofos", name: "Petastē with Elaphron and Apostrophos", modifiers: ['Shift'], trigger: 'Comma', codePoints: [0xE064], status: 'verified', pitch: -3, frequency: 'uncommon' },
  { id: "kentimata", name: "Kentēmata", modifiers: ['KeyR'], trigger: 'Semicolon', codePoints: [0xE081], status: 'verified', pitch: 1, frequency: 'common' },
  { id: "oligonIsonKentimata", name: "Ison and Kentēmata with Supporting Oligon", modifiers: ['KeyR'], trigger: 'KeyJ', codePoints: [0xE084], status: 'verified', pitch: 1, frequency: 'common' },
  { id: "oligonKentimataAbove", name: "Oligon and Kentēmata", modifiers: ['KeyR'], trigger: 'KeyK', codePoints: [0xE083], status: 'verified', pitch: 2, frequency: 'common' },
  { id: "oligonKentimataBelow", name: "Kentēmata and Oligon", modifiers: ['Shift', 'KeyR'], trigger: 'KeyK', codePoints: [0xE082], status: 'verified', pitch: 2, frequency: 'common' },
  { id: "oligonKentimaMiddleKentimata", name: "Oligon with Kentēma and Kentēmata", modifiers: ['KeyR'], trigger: 'KeyL', codePoints: [0xE085], status: 'verified', pitch: 3, frequency: 'uncommon' },
  { id: "oligonYpsiliRightKentimata", name: "Oligon with Ypsēlē and Kentēmata (right)", modifiers: ['KeyR'], trigger: 'Quote', codePoints: [0xE086], status: 'verified', pitch: 5, frequency: 'uncommon' },
  { id: "oligonYpsiliLeftKentimata", name: "Oligon with Ypsēlē and Kentēmata (left)", modifiers: ['KeyR'], trigger: 'KeyU', codePoints: [0xE087], status: 'verified', pitch: 6, frequency: 'uncommon' },
  { id: "oligonApostrofosKentimata", name: "Apostrophos and Kentēmata with Supporting Oligon", modifiers: ['KeyR'], trigger: 'KeyN', codePoints: [0xE088], status: 'verified', pitch: 0, frequency: 'uncommon' },
  { id: "oligonElafronKentimata", name: "Elaphron and Kentēmata with Supporting Oligon", modifiers: ['KeyR'], trigger: 'KeyM', codePoints: [0xE08A], status: 'verified', pitch: -1, frequency: 'uncommon' },
  { id: "oligonRunningElafronKentimata", name: "Running Elaphron and Kentēmata with Supporting Oligon", modifiers: ['Shift', 'KeyR'], trigger: 'KeyM', codePoints: [0xE08B], status: 'verified', pitch: -2, frequency: 'uncommon' },
  { id: "oligonElafronApostrofosKentimata", name: "Elaphron with Apostrophos and Kentēmata with Supporting Oligon", modifiers: ['KeyR'], trigger: 'Comma', codePoints: [0xE08C], status: 'verified', pitch: -2, frequency: 'uncommon' },
  { id: "oligonChamiliKentimata", name: "Hamēlē and Kentēmata with Supporting Oligon", modifiers: ['KeyR'], trigger: 'Period', codePoints: [0xE08D], status: 'verified', pitch: -3, frequency: 'uncommon' },
  { id: "oligonYporroiKentimata", name: "Yporroē and Kentēmata with Supporting Oligon", modifiers: ['KeyR'], trigger: 'Slash', codePoints: [0xE089], status: 'verified', pitch: -1, frequency: 'uncommon' },
  { id: "oligonIson", name: "Ison with Supporting Oligon", modifiers: ['Shift', 'KeyF'], trigger: 'KeyJ', codePoints: [0xE010], status: 'verified', pitch: 0, frequency: 'uncommon' },
  { id: "oligonApostrofos", name: "Apostrophos with Supporting Oligon", modifiers: ['Shift', 'KeyF'], trigger: 'KeyN', codePoints: [0xE011], status: 'verified', pitch: -1, frequency: 'uncommon' },
  { id: "oligonElafron", name: "Elaphron with Supporting Oligon", modifiers: ['Shift', 'KeyF'], trigger: 'KeyM', codePoints: [0xE013], status: 'verified', pitch: -2, frequency: 'uncommon' },
  { id: "oligonYporroi", name: "Yporroē with Supporting Oligon", modifiers: ['Shift', 'KeyD'], trigger: 'Slash', codePoints: [0xE012], status: 'verified', pitch: -2, frequency: 'uncommon' },
  { id: "oligonElafronApostrofos", name: "Elaphron with Apostrophos and Supporting Oligon", modifiers: ['Shift', 'KeyF'], trigger: 'Comma', codePoints: [0xE014], status: 'verified', pitch: -3, frequency: 'uncommon' },
  { id: "oligonChamili", name: "Hamēlē with Supporting Oligon", modifiers: ['Shift', 'KeyF'], trigger: 'Period', codePoints: [0xE015], status: 'verified', pitch: -4, frequency: 'uncommon' },
  { id: "leimma1", name: "Rest (1 beat)", modifiers: ['Shift', 'KeyB'], trigger: 'KeyJ', codePoints: [0xE0E0], status: 'verified', pitch: null, frequency: 'fixed' },
  { id: "leimma2", name: "Rest (2 beats)", modifiers: ['Shift', 'KeyB'], trigger: 'KeyK', codePoints: [0xE0E1], status: 'verified', pitch: null, frequency: 'fixed' },
  { id: "leimma3", name: "Rest (3 beats)", modifiers: ['Shift', 'KeyB'], trigger: 'KeyL', codePoints: [0xE0E2], status: 'verified', pitch: null, frequency: 'fixed' },
  { id: "leimma4", name: "Rest (4 beats)", modifiers: ['Shift', 'KeyB'], trigger: 'Semicolon', codePoints: [0xE0E3], status: 'verified', pitch: null, frequency: 'fixed' },
  { id: "stavros", name: "Cross", modifiers: ['Shift'], trigger: 'Equal', codePoints: [0xE0C0], status: 'verified', pitch: null, frequency: 'fixed' },
  { id: "breath", name: "Breath", modifiers: [], trigger: 'Equal', codePoints: [0xE0C1], status: 'verified', pitch: null, frequency: 'fixed' },
];
