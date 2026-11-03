# Neume Type: MVP spec

A Monkeytype-style drill for entering Byzantine chant neumes with Neanes keyboard shortcuts. It is a throwaway prototype whose only job is to show whether the idea is fun enough to pursue. Playable beats polished.

## 1. Scope

**In:** typing neumes, Neanes keybinds, errors for wrong input, speed and accuracy result, restart button. The 61 entries in the guide's Characters of Quantity table (Appendix A), including combinations.

**Out:** qualitative characters, fthoras, accounts, online features, themes, modes, settings, saved history, per-neume stats, backend, database, analytics.

## 2. Open decisions (defaults apply unless the user changes them)

- **D1, hints.** The brief gives no way to learn a shortcut inside the app, so a newcomer could not finish a test. Default: after a wrong attempt, show the current neume's name and shortcut until it is entered correctly. No hint before the first wrong attempt, and no toggle.
- **D2, non-quantity glyphs in the table.** The guide lists Rest (4), Cross and Breath under Quantity, but SBMuFL puts them outside its quantity range (U+E000-E09F). Default: include them, following the guide as the brief says. To exclude them, remove entries 56-61, which leaves 55.

## 3. Test flow

1. On load or restart, draw 20 neumes at random with the weighted chances in section 3a, with replacement, from entries not marked `unverified`. Repeats are allowed. The random source is injectable for tests.
2. The first undone neume is highlighted.
3. Each **attempt** (section 4) is compared with the current neume. Correct: advance. Wrong: stay, count one error, flash the error colour.
4. The clock starts at the first attempt, right or wrong. It stops at the attempt that correctly enters neume 20. Modifier presses alone do not start it.
5. Results replace the test:
   - Total time = stop - start, shown in seconds to 2 decimals.
   - Neumes per minute = 20 / (time in minutes), to 1 decimal.
   - Accuracy = correct attempts / total attempts, as a percentage to 1 decimal.
   - Example: 40,000 ms with 5 errors gives 40.00 s, 30.0 per minute, 80.0% (20/25).
6. The restart button is visible during the test and on results. It draws a new test and resets clock and counts. Attempts on the results screen are ignored.

## 3a. Weighting

The draw is weighted, not uniform: common neumes come up more often than rare ones. The pitch and class of each neume are in [`docs/neume-weights.md`](docs/neume-weights.md), which the owner checked on 2026-11-03 and which is the source for those two columns. They are stored on each keymap entry as `pitch` (`null` for Rest, Cross and Breath) and `frequency` (`common`, `uncommon` or `fixed`). `status` is unchanged: all 61 stay in the draw.

- Raw weight = 0.5^|pitch|, times 0.25 if uncommon. Fixed entries have raw weight 0.02.
- Chance = raw weight over the total, with a floor of 0.25% per draw. An entry below the floor gets exactly the floor, the others are scaled proportionally so the total is 100%, and this repeats until stable.
- The halving factor, uncommon multiplier, fixed weight and floor are named constants in `src/core/weights.ts`. The sampler uses the injected random source and handles `random()` values of 0 and just below 1.

## 4. Chord input

Neanes says shortcuts use "the physical key positions of a US keyboard layout" and that a plus sign means "hold the first key or keys while pressing the last key". So order is the only rule and **no timing window exists**.

### Definitions

- **Modifier:** a key the keymap data marks as a modifier. These are the guide's 15 (`Q W E R T A S D F G Z X C V B`) plus `Shift` (`ShiftLeft` or `ShiftRight`, one logical modifier).
- **Scored key:** `KeyA`-`KeyZ`, `Digit0`-`Digit9`, `Minus`, `Equal`, `BracketLeft`, `BracketRight`, `Backslash`, `Semicolon`, `Quote`, `Comma`, `Period`, `Slash`, `Backquote`, excluding modifiers.
- **Attempt:** one keydown of a scored key, paired with the exact set of modifiers held at that moment.

### Rules

| # | Situation | Rule |
|---|---|---|
| R1 | Matching | Use `event.code` only, never `event.key`. An attempt matches only if the trigger and the full modifier set are equal to the target's. Extra modifiers make it wrong. |
| R2 | Timing | None. A modifier may be held for any time before the trigger. The attempt fires on the trigger's keydown. |
| R3 | Together versus in sequence | "Together" means the modifier is still down at the trigger's keydown. Anything else is a sequence, and the trigger is judged without that modifier. |
| R4 | Order | Modifier after trigger does not combine: the trigger has already fired. Order among modifiers does not matter. |
| R5 | Release order | Irrelevant. Releasing only updates the held set. A modifier held across attempts still applies to the next one, with no grace period. |
| R6 | Modifier tapped alone | Nothing happens: no attempt, no error, no clock start. This includes `B`, which is Haplē alone in Neanes but out of scope here. |
| R7 | Auto-repeat | `event.repeat === true` is ignored for every key, so holding a key can never answer the next neume. |
| R8 | Wrong chord | Exactly one error per attempt, however many keys are involved. Modifiers never add errors. |
| R9 | Rollover | A second scored keydown while the first is still down is its own attempt, so fast rolling works. |
| R10 | Unknown scored key | A scored key with no quantity entry (such as `H`, `Y`, `Digit5`, or `T` + `J`) is a wrong attempt. |
| R11 | Unscored keys | Space, Enter, Tab, Escape, arrows, function keys and Caps Lock are ignored and not prevented. |
| R12 | Browser combinations | While Ctrl, Meta or Alt is down, keydowns are ignored and not prevented, so Cmd+R and Ctrl+W work. No quantity shortcut uses these keys. |
| R13 | Browser defaults | Modifier and scored keydowns otherwise call `preventDefault`. This stops Firefox quick find on `/` and `'`. There is no text input, so the macOS accent popup does not apply. |
| R14 | Lost keyups | On window `blur` or hidden `visibilitychange`, clear the held set. On each keydown, sync Shift from `event.shiftKey`. A keyup for a key not held is ignored. Events with `isComposing` are ignored. |
| R15 | Restart | Clears the session, not the held set, because the keys are physically still down. |

### Worked examples

Keys are `↓` down and `↑` up. Each row is a required unit test.

| ID | Target | Events | Result |
|---|---|---|---|
| C1 | Oligon with Kentēma (below), `L` | ↓L | correct |
| C2 | Oligon with Kentēma, `S + L` | ↓S ↓L ↑L ↑S | correct |
| C3 | `S + L` | ↓S ↓L ↑S ↑L | correct (R5) |
| C4 | `S + L` | ↓S ↑S ↓L | 1 error: judged as `L` (R3) |
| C5 | `S + L` | ↓L ↓S | 1 error from ↓L, nothing from ↓S (R4) |
| C6 | `L` | ↓S ↓L | 1 error: judged as `S + L` |
| C7 | `L` | ↓S ↑S | nothing, clock not started (R6) |
| C8 | `S + L` | ↓S, 5 s pause, ↓L | correct (R2) |
| C9 | `Shift + R + K` | ↓Shift ↓R ↓K | correct |
| C10 | `Shift + R + K` | ↓R ↓Shift ↓K | correct (R4) |
| C11 | `R + K` | ↓Shift ↓R ↓K | 1 error (R1) |
| C12 | `L` | ↓S ↓D ↓L | 1 error, not 2 (R8) |
| C13 | `J` then `J` | ↓J, repeat ↓J ×3 | first correct, others ignored, second `J` still current (R7) |
| C14 | `S + L` then `S + L` | ↓S ↓L ↑L ↓L | both correct (R5) |
| C15 | `S + L` then `N` | ↓S ↓L ↑L ↓N | correct, then 1 error: judged as `S + N` (R5) |
| C16 | `J` then `K` | ↓J ↓K ↑J ↑K | both correct (R9) |
| C17 | `J` | ↓Meta ↓J | ignored, not prevented (R12) |
| C18 | `J` | ↓H | 1 error (R10) |
| C19 | `J` | ↓Space, ↓Tab | ignored (R11) |
| C20 | `L` | ↓S, window blur, ↓L | correct: held set cleared (R14) |
| C21 | `Shift + K` | ↓ShiftLeft ↓ShiftRight ↑ShiftLeft ↓K | correct: Shift still held |
| C22 | `Shift + =` | ↓Shift ↓Equal | correct: `event.code` works for punctuation |

## 5. Rendering

- Font: `Neanes.otf` 1.0.10 via `@font-face` from `public/fonts/`, with the OFL at `public/fonts/OFL.txt`.
- Every entry is one precomposed SBMuFL code point. **No overlays or positioning are needed, and no stacked neume is excluded or unverified.** Keep the `codePoints` field as a list anyway, because that is what the data records.
- The font has large vertical extents (winAscent 1.4, winDescent 0.466 em). Set a generous line height so glyphs do not clip.

**Sources.** Download both from `github.com/neanes/sbmufl` at commit `13d7675d6070c87b83639a4ded6e3a2fb83df166`: `fonts/Neanes.otf` (SHA-256 `86301a892998089a1d9effa0d40ccd4bc6eb5f8eaa372cf4136354bb2d5c6a90`, byte-identical to `src/assets/fonts/Neanes.otf` in `neanes/neanes`) and `fonts/LICENSE` (SHA-256 `4ebeded2bb3a6f553c8f85d87b1807092b7bbe4f7a169e321e0f8c13ff0d9261`). The `neanes/neanes` repo holds the font but only a GPL `LICENSE`, so the OFL text must come from `neanes/sbmufl`. The licence file carries no copyright line; the font's own copyright string reads "Copyright (c) 2022, Daniel". Do not modify the font.

## 6. Look

Copy the layout and feel of default Monkeytype by eye, with no Monkeytype code or assets. Centred column, minimal chrome, system monospace stack for UI text, neumes in a wrapping row. Palette (approximate, recalled, not sourced): background `#323437`, accent/current `#e2b714`, untyped text (labels, stats) `#646669`, error `#ca4754`. Neume states (owner's choice, T13): done `#f2f1ea` (very bright), untyped `#4a4c50` (deliberately low contrast, close to the background), current `#e2b714`. Buttons keep `#d1d0c5`.

## 7. Acceptance criteria

1. Keymap data has exactly 61 entries that match Appendix A, unique chords, and no trigger that is also a modifier.
2. All 22 examples in section 4 pass as unit tests with no DOM.
3. A sampled test has 20 neumes and never includes an `unverified` entry.
4. Scoring matches the section 3 example and formulas under a fake clock. The clock does not start on modifier presses and stops at neume 20.
5. In a real browser, Playwright completes a full test with real key events, including chords and one deliberate wrong chord, and the results show accuracy 95.2% (20/21).
6. In a real browser, `S` tapped and released then `L` counts as wrong on an `S + L` target, and held `S` then `L` counts as correct.
7. In a real browser, all 61 code points render from the Neanes font, not a fallback.
8. Restart gives a new test with zeroed clock and counts.
9. Type-check, ESLint, Vitest and Playwright all pass locally and in GitHub Actions.
10. The font and OFL files match the SHA-256 values in section 5.
11. Human check: glyphs match the guide's Symbol column, and a full test feels playable.
12. The pitch and class of all 61 rows in `docs/neume-weights.md` equal the keymap's `pitch` and `frequency`, checked by a unit test that fails on any difference.
13. Chances sum to 1, none is below 0.25%, Ison is highest, and hand-calculated values hold, including a case where the floor needs more than one pass.
14. A seeded large sample draws each entry at about its chance, includes the rarest entry, and `random()` of 0 and just below 1 give the first and last pool entries.

## Appendix A: Characters of Quantity

**Sources** (accessed 2026-11-02):

- Shortcuts, names, and code points as rendered in the Symbol column: https://neanes.github.io/neanes/guide/keyboard.html#characters-of-quantity
- Code point to glyph name: https://github.com/neanes/sbmufl/tree/13d7675d6070c87b83639a4ded6e3a2fb83df166/docs/tables (`quantity.md`, `quality.md`, `temporal-augmentation.md`)
- Font cmap and metadata (`fonts/neanes.metadata.json`, advance and bounding box) were checked for all 61: each code point is present with a non-empty glyph.

**Verified** means all of those agree. Not machine-checked: how each glyph looks (criterion 11). The event column is derived from the shortcut. `Shift` means `ShiftLeft` or `ShiftRight`.

**Note on names.** The brief calls `S + L` "Oligon with Kentēma (Side)"; the guide's name is "Oligon with Kentēma", which is used here.

| # | Shortcut | `event.code` | Name | Code point, glyph | Rendering | Status |
|---|---|---|---|---|---|---|
| 1 | `J` | KeyJ | Ison | U+E000 `ison` | precomposed | verified |
| 2 | `K` | KeyK | Oligon | U+E001 `oligon` | precomposed | verified |
| 3 | `L` | KeyL | Oligon with Kentēma (below) | U+E003 `oligonKentimaBelow` | precomposed | verified |
| 4 | `S` + `L` | KeyS + KeyL | Oligon with Kentēma | U+E002 `oligonKentimaMiddle` | precomposed | verified |
| 5 | `;` | Semicolon | Oligon with Kentēma (above) | U+E004 `oligonKentimaAbove` | precomposed | verified |
| 6 | `'` | Quote | Oligon with Ypsēlē (right) | U+E005 `oligonYpsiliRight` | precomposed | verified |
| 7 | `U` | KeyU | Oligon with Ypsēlē (left) | U+E006 `oligonYpsiliLeft` | precomposed | verified |
| 8 | `I` | KeyI | Oligon with Ypsēlē and Kentēma (horizontal) | U+E007 `oligonKentimaYpsiliRight` | precomposed | verified |
| 9 | `O` | KeyO | Oligon with Ypsēlē and Kentēma (vertical) | U+E008 `oligonKentimaYpsiliMiddle` | precomposed | verified |
| 10 | `P` | KeyP | Oligon with Double Ypsēlē | U+E009 `oligonDoubleYpsili` | precomposed | verified |
| 11 | `Shift` + `J` | Shift + KeyJ | Petastē with Ison | U+E040 `petastiIson` | precomposed | verified |
| 12 | `Shift` + `K` | Shift + KeyK | Petastē | U+E041 `petasti` | precomposed | verified |
| 13 | `Shift` + `L` | Shift + KeyL | Petastē with Oligon | U+E042 `petastiOligon` | precomposed | verified |
| 14 | `Shift` + `;` | Shift + Semicolon | Petastē with Kentēma (above) | U+E043 `petastiKentima` | precomposed | verified |
| 15 | `Shift` + `'` | Shift + Quote | Petastē with Ypsēlē (right) | U+E044 `petastiYpsiliRight` | precomposed | verified |
| 16 | `Shift` + `U` | Shift + KeyU | Petastē with Ypsēlē (left) | U+E045 `petastiYpsiliLeft` | precomposed | verified |
| 17 | `Shift` + `I` | Shift + KeyI | Petastē with Ypsēlē and Kentēma (horizontal) | U+E046 `petastiKentimaYpsiliRight` | precomposed | verified |
| 18 | `Shift` + `O` | Shift + KeyO | Petastē with Ypsēlē and Kentēma (vertical) | U+E047 `petastiKentimaYpsiliMiddle` | precomposed | verified |
| 19 | `Shift` + `P` | Shift + KeyP | Petastē with Double Ypsēlē | U+E048 `petastiDoubleYpsili` | precomposed | verified |
| 20 | `N` | KeyN | Apostrophos | U+E021 `apostrofos` | precomposed | verified |
| 21 | `S` + `N` | KeyS + KeyN | Ison and Apostrophos | U+E020 `isonApostrofos` | precomposed | verified |
| 22 | `M` | KeyM | Elaphron | U+E024 `elafron` | precomposed | verified |
| 23 | `F` + `M` | KeyF + KeyM | Running Elaphron | U+E025 `runningElafron` | precomposed | verified |
| 24 | `D` + `M` | KeyD + KeyM | Yporroē | U+E023 `yporroi` | precomposed | verified |
| 25 | `S` + `M` | KeyS + KeyM | Double Apostrophos | U+E022 `apostrofosSyndesmos` | precomposed | verified |
| 26 | `,` | Comma | Elaphron with Apostrophos | U+E026 `elafronApostrofos` | precomposed | verified |
| 27 | `.` | Period | Hamēlē | U+E027 `chamili` | precomposed | verified |
| 28 | `/` | Slash | Hamēlē with Apostrophos | U+E028 `chamiliApostrofos` | precomposed | verified |
| 29 | `S` + `/` | KeyS + Slash | Hamēlē with Elaphron | U+E029 `chamiliElafron` | precomposed | verified |
| 30 | `D` + `/` | KeyD + Slash | Hamēlē with Elaphron and Apostrophos | U+E02A `chamiliElafronApostrofos` | precomposed | verified |
| 31 | `F` + `/` | KeyF + Slash | Double Hamēlē | U+E02B `doubleChamili` | precomposed | verified |
| 32 | `Shift` + `N` | Shift + KeyN | Petastē with Apostrophos | U+E060 `petastiApostrofos` | precomposed | verified |
| 33 | `Shift` + `M` | Shift + KeyM | Petastē with Elaphron | U+E062 `petastiElafron` | precomposed | verified |
| 34 | `Shift` + `S` + `M` | Shift + KeyS + KeyM | Petastē with Running Elaphron | U+E063 `petastiRunningElafron` | precomposed | verified |
| 35 | `Shift` + `D` + `M` | Shift + KeyD + KeyM | Petastē with Yporroē | U+E061 `petastiYporroi` | precomposed | verified |
| 36 | `Shift` + `,` | Shift + Comma | Petastē with Elaphron and Apostrophos | U+E064 `petastiElafronApostrofos` | precomposed | verified |
| 37 | `R` + `;` | KeyR + Semicolon | Kentēmata | U+E081 `kentimata` | precomposed | verified |
| 38 | `R` + `J` | KeyR + KeyJ | Ison and Kentēmata with Supporting Oligon | U+E084 `oligonIsonKentimata` | precomposed | verified |
| 39 | `R` + `K` | KeyR + KeyK | Oligon and Kentēmata | U+E083 `oligonKentimataAbove` | precomposed | verified |
| 40 | `Shift` + `R` + `K` | Shift + KeyR + KeyK | Kentēmata and Oligon | U+E082 `oligonKentimataBelow` | precomposed | verified |
| 41 | `R` + `L` | KeyR + KeyL | Oligon with Kentēma and Kentēmata | U+E085 `oligonKentimaMiddleKentimata` | precomposed | verified |
| 42 | `R` + `'` | KeyR + Quote | Oligon with Ypsēlē and Kentēmata (right) | U+E086 `oligonYpsiliRightKentimata` | precomposed | verified |
| 43 | `R` + `U` | KeyR + KeyU | Oligon with Ypsēlē and Kentēmata (left) | U+E087 `oligonYpsiliLeftKentimata` | precomposed | verified |
| 44 | `R` + `N` | KeyR + KeyN | Apostrophos and Kentēmata with Supporting Oligon | U+E088 `oligonApostrofosKentimata` | precomposed | verified |
| 45 | `R` + `M` | KeyR + KeyM | Elaphron and Kentēmata with Supporting Oligon | U+E08A `oligonElafronKentimata` | precomposed | verified |
| 46 | `Shift` + `R` + `M` | Shift + KeyR + KeyM | Running Elaphron and Kentēmata with Supporting Oligon | U+E08B `oligonRunningElafronKentimata` | precomposed | verified |
| 47 | `R` + `,` | KeyR + Comma | Elaphron with Apostrophos and Kentēmata with Supporting Oligon | U+E08C `oligonElafronApostrofosKentimata` | precomposed | verified |
| 48 | `R` + `.` | KeyR + Period | Hamēlē and Kentēmata with Supporting Oligon | U+E08D `oligonChamiliKentimata` | precomposed | verified |
| 49 | `R` + `/` | KeyR + Slash | Yporroē and Kentēmata with Supporting Oligon | U+E089 `oligonYporroiKentimata` | precomposed | verified |
| 50 | `Shift` + `F` + `J` | Shift + KeyF + KeyJ | Ison with Supporting Oligon | U+E010 `oligonIson` | precomposed | verified |
| 51 | `Shift` + `F` + `N` | Shift + KeyF + KeyN | Apostrophos with Supporting Oligon | U+E011 `oligonApostrofos` | precomposed | verified |
| 52 | `Shift` + `F` + `M` | Shift + KeyF + KeyM | Elaphron with Supporting Oligon | U+E013 `oligonElafron` | precomposed | verified |
| 53 | `Shift` + `D` + `/` | Shift + KeyD + Slash | Yporroē with Supporting Oligon | U+E012 `oligonYporroi` | precomposed | verified |
| 54 | `Shift` + `F` + `,` | Shift + KeyF + Comma | Elaphron with Apostrophos and Supporting Oligon | U+E014 `oligonElafronApostrofos` | precomposed | verified |
| 55 | `Shift` + `F` + `.` | Shift + KeyF + Period | Hamēlē with Supporting Oligon | U+E015 `oligonChamili` | precomposed | verified |
| 56 | `Shift` + `B` + `J` | Shift + KeyB + KeyJ | Rest (1 beat) | U+E0E0 `leimma1` | precomposed | verified |
| 57 | `Shift` + `B` + `K` | Shift + KeyB + KeyK | Rest (2 beats) | U+E0E1 `leimma2` | precomposed | verified |
| 58 | `Shift` + `B` + `L` | Shift + KeyB + KeyL | Rest (3 beats) | U+E0E2 `leimma3` | precomposed | verified |
| 59 | `Shift` + `B` + `;` | Shift + KeyB + Semicolon | Rest (4 beats) | U+E0E3 `leimma4` | precomposed | verified |
| 60 | `Shift` + `=` | Shift + Equal | Cross | U+E0C0 `stavros` | precomposed | verified |
| 61 | `=` | Equal | Breath | U+E0C1 `breath` | precomposed | verified |
