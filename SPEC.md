# Neume Type: spec

A Monkeytype-style drill for entering Byzantine chant neumes with Neanes keyboard shortcuts. It started as a prototype and is now developed further; post-MVP goals are in `goals.md`.

## 1. Scope

**In:** typing neumes, Neanes keybinds, errors for wrong input, speed and accuracy result, restart button, practice options (show shortcuts, drills, test length of 10, 20 or 50) and per-neume stats for the run. The 61 entries in the guide's Characters of Quantity table (Appendix A), including combinations. Qualitative characters and fthoras (Appendix B, 29 entries), drilled separately in the V and T drills and not part of the default draw.

**Out:** accounts, online features, themes, backend, database, analytics.

**Storage and hosting:** browser storage for saved progress is allowed (U12). Static hosting is allowed with `OFL.txt` beside the font. Still out: accounts, backend, server database, analytics.

## 2. Open decisions (defaults apply unless the user changes them)

- **D1, hints.** The brief gives no way to learn a shortcut inside the app, so a newcomer could not finish a test. Default: after a wrong attempt, show the current neume's name and shortcut until it is entered correctly. No hint before the first wrong attempt, and no toggle.
- **D2, non-quantity glyphs in the table.** The guide lists Rest (4), Cross and Breath under Quantity, but SBMuFL puts them outside its quantity range (U+E000-E09F). Default: include them, following the guide as the brief says. To exclude them, remove entries 56-61, which leaves 55.

## 3. Test flow

1. On load or restart, draw the chosen test length (10, 20 or 50; default 20) of neumes at random with the weighted chances in section 3a, with replacement, from entries not marked `unverified`. Repeats are allowed, including back to back, unless *avoid repeats* is on (section 3b). The random source is injectable for tests.
2. The first undone neume is highlighted.
3. Each **attempt** (section 4) is compared with the current neume. Correct: advance. Wrong: stay, count one error, and show the current neume in the error colour until it is entered correctly (steady, not blinking).
4. The clock starts at the first attempt, right or wrong. It stops at the attempt that correctly enters the last neume of the test. Modifier presses alone do not start it.
5. Results replace the test:
   - Total time = stop - start, shown in seconds to 2 decimals.
   - Neumes per minute = test length / (time in minutes), to 1 decimal.
   - Accuracy = correct attempts / total attempts, as a percentage to 1 decimal.
   - Example: 40,000 ms with 5 errors gives 40.00 s, 30.0 per minute, 80.0% (20/25).
6. The restart button is visible during the test and on results. It draws a new test and resets clock and counts. Clicking the title does the same. Attempts on the results screen are ignored.

## 3a. Weighting

The draw is weighted, not uniform: common neumes come up more often than rare ones. The pitch and class of each neume are in [`docs/neume-weights.md`](docs/neume-weights.md), which the owner checked on 2026-11-03 and which is the source for those two columns. They are stored on each keymap entry as `pitch` (`null` for Rest, Cross and Breath) and `frequency` (`common`, `uncommon` or `fixed`). `status` is unchanged: all 61 stay in the draw.

- Raw weight = 0.5^|pitch|, times 0.25 if uncommon. Fixed entries have raw weight 0.02.
- Chance = raw weight over the total, with a floor of 0.25% per draw. An entry below the floor gets exactly the floor, the others are scaled proportionally so the total is 100%, and this repeats until stable.
- The halving factor, uncommon multiplier, fixed weight and floor are named constants in `src/core/weights.ts`. The sampler uses the injected random source and handles `random()` values of 0 and just below 1.

## 3b. Practice options

- **Show shortcuts:** when on, the current neume's name and shortcut show from the start (and after correct attempts), never on the results screen. Off by default. Toggling restarts the test, so a run is wholly practice or not.
- **Drill:** `all` (every verified entry, the default draw), `plain` (no letter modifier, Shift-only allowed; 28 entries), then one drill per letter modifier used by a verified entry, in `MODIFIERS` order: R (13), S (5), D (4), F (7), B (4, the rests). Grouping follows the guide's modifier table (S, D, F are Quantity Modifiers 1 to 3, R is Kentemata, B is Temporal Augmentation); the button title shows the category. Changing the drill restarts. Draws within a drill use the same weights and floor, over that drill's pool.
- **Avoid repeats:** off by default. When on, the same neume id never appears twice in a row within a run. Position 0 is drawn as usual; each later position is drawn from the pool minus the previous id with the remaining chances renormalised (P(j) = c_j / (1 - c_prev)), so the relative chances among the others are unchanged. It uses one `random()` per neume, on or off, and scales it into the reduced range instead of redrawing. A pool with fewer than 2 drawable entries cannot honour it and throws; that is unreachable because every drill has at least 2. Toggling restarts the test. It does not affect personal bests (the key stays drill and length).
- **Per-neume stats:** the session counts attempts and errors per target id for the current run. The results view lists "Hardest this run": up to 3 neumes with at least one error, sorted by errors desc, then attempts desc, then id, each showing the glyph, name, shortcut and "N errors". With none it shows "No errors".

## 3c. Saved progress

Stored only in the browser (`localStorage`), never sent anywhere. One key, `neume-type.progress`, holding JSON:

```
{ version: 1,
  settings: { drillId, showShortcuts, length?, noRepeats? },
  bests:  { "<drillId>:<length>": { neumesPerMinute, accuracyPercent, totalSeconds, date } },
  neumes: { "<keymap id>": { attempts, errors } } }   // all time
```

- **Versioning:** optional added fields do not bump `version`; a breaking change bumps it and adds a migration. A stored version newer than the code is not understood: the game uses empty progress in memory and never writes, so newer data is not overwritten. Invalid JSON or a wrong shape: the raw text is copied once to `neume-type.progress.corrupt`, and the game starts empty and writable. Unknown neume or drill ids are kept, not deleted.
- **Personal best:** the highest neumes per minute for a drill and length; a tie goes to higher accuracy. A run with show shortcuts on, or with no rate, never sets a best, but its per-neume tallies still add to the all-time totals.
- **Weakest neumes:** all-time, ranked by error rate (errors / attempts), needing at least 3 attempts and at least one error, then errors desc, then id; top 5. Shown only in the results, after the hardest list, and only when not empty: never during a test or on a fresh start. The panel is borderless and quiet, its columns are neume, name, shortcut and miss rate (errors / attempts), and a muted line states "all time · 3+ attempts". Decided with the owner on 2026-11-21.
- **Results** show the best for the current drill and length, and "New best" when the run set it. A "Reset saved progress" button asks for confirmation, then clears the key.
- Missing or throwing storage (private mode, quota) never breaks the game: progress then lives in memory only. Settings (drill, show shortcuts, length, avoid repeats) are saved and restored on load; an unknown stored drill falls back to `all`, an absent or invalid stored length to 20, and an absent or invalid stored avoid-repeats value to off. Saving settings merges into the stored ones.

## 3d. First visit and footer

Decided with the owner on 2026-11-26.

- **Instruction:** until a run has been finished in this browser, a short instruction shows between the settings and the neumes: "Type each neume with its Neanes shortcut, using US key positions. For S + L, hold S and press L. A wrong key shows the answer. You need a physical keyboard." "Finished" means the saved progress holds per-neume tallies, so practice runs count and nothing new is stored. It stays through an unfinished run and a reload, so the neumes do not move mid-test, and it returns after "Reset saved progress". Without working storage it shows again on each load until a run is finished.
- **Reset exception:** "Reset saved progress" takes effect at once. Pressed during a run, it inserts the instruction and moves the neumes down once; on the results screen it appears above the results.
- **Hint position:** the hint (D1, and section 3b's show shortcuts) sits between the instruction and the neumes, so a first-time visitor sees the answer without scrolling. Its space is reserved during a test (one line, three on screens up to 46rem), so at default text size and widths from 320px showing it never moves the neumes (narrower screens or text-only zoom may move them by a line). The shortcut never breaks across lines, and the hint uses the readable error colour (`--error-text`, at least 4.5:1). It sticks to the top of the window when a long test is scrolled. Decided with the owner on 2026-11-26.
- **Footer:** on both the test and results screens, links to Neanes (font and shortcuts), the font licence (`fonts/OFL.txt` under the Vite base, like the font) and feedback (the project's GitHub issues). Links open in a new tab, so a run is not lost.
- Both texts meet 4.5:1 contrast and fit a 390 px screen.

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
| R6 | Modifier tapped alone | A modifier tapped alone is an attempt only if some keymap entry has that key as its trigger (none today). The attempt fires on the key's release, provided no other key went down between its keydown and keyup (auto-repeats excepted). Its modifiers are those still held at the release. Otherwise nothing happens: no attempt, no error, no clock start. |
| R7 | Auto-repeat | `event.repeat === true` is ignored for every key, so holding a key can never answer the next neume. |
| R8 | Wrong chord | Exactly one error per attempt, however many keys are involved. Modifiers never add errors. |
| R9 | Rollover | A second scored keydown while the first is still down is its own attempt, so fast rolling works. |
| R10 | Unknown scored key | A scored key with no quantity entry (such as `H`, `Y`, `Digit5`, or `T` + `J`) is a wrong attempt. |
| R11 | Unscored keys | Space, Enter, Tab, Escape, arrows, function keys and Caps Lock are ignored and not prevented. |
| R12 | Browser combinations | While Ctrl, Meta or Alt is down, keydowns are ignored and not prevented, so Cmd+R and Ctrl+W work. No quantity shortcut uses these keys. |
| R13 | Browser defaults | Modifier and scored keydowns otherwise call `preventDefault`. This stops Firefox quick find on `/` and `'`. There is no text input, so the macOS accent popup does not apply. |
| R14 | Lost keyups | On window `blur` or hidden `visibilitychange`, clear the held set. On each keydown, sync Shift from `event.shiftKey`. On any keydown with `metaKey` set, clear every held key except Shift (macOS drops keyups while Cmd is down). A keyup for a key not held is ignored. Events with `isComposing` are ignored. |
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

With a solo entry for `B` (test data only, no keymap entry has a modifier trigger today):

| # | Target | Keys | Result |
|---|---|---|---|
| C23 | `B` | ↓B ↑B | one attempt on release: trigger B, no modifiers, correct (R6) |
| C24 | `B + J` | ↓B ↓J ↑J ↑B | one attempt on ↓J (B + J); the B release adds none |
| C25 | `B` | ↓B, repeat ↓B ×2, ↑B | one attempt on release; repeats do not cancel |
| C26 | `B` | ↓B, window blur, ↑B | nothing (R14) |
| C27 | `B` | ↓Shift ↓B ↑B | 1 error: judged as `Shift + B` |
| C28 | `B` | ↓B ↓Meta ↑B | nothing |
| C29 | `B` | ↓Shift ↓B ↑Shift ↑B | correct: Shift was already released at the release |

| # | Target | Keys | Result |
|---|---|---|---|
| C30 | `L` | ↓S ↓Meta ↑Meta ↓L (the S keyup is lost) | correct: the Cmd keydown cleared S, so L is judged alone (R14); Shift would have been kept |

## 5. Rendering

- Font: `Neanes.otf` 1.0.10 via `@font-face` from `public/fonts/`, with the OFL at `public/fonts/OFL.txt`.
- Appendix A entries are one precomposed SBMuFL code point. Appendix B entries are the guide's Symbol sequence (a sample base neume plus a zero-advance mark), positioned by the font's own GPOS. No CSS overlays. The `codePoints` field is the list to render.
- The font has large vertical extents (winAscent 1.4, winDescent 0.466 em). Set a generous line height so glyphs do not clip.

**Sources.** Download both from `github.com/neanes/sbmufl` at commit `13d7675d6070c87b83639a4ded6e3a2fb83df166`: `fonts/Neanes.otf` (SHA-256 `86301a892998089a1d9effa0d40ccd4bc6eb5f8eaa372cf4136354bb2d5c6a90`, byte-identical to `src/assets/fonts/Neanes.otf` in `neanes/neanes`) and `fonts/LICENSE` (SHA-256 `4ebeded2bb3a6f553c8f85d87b1807092b7bbe4f7a169e321e0f8c13ff0d9261`). The `neanes/neanes` repo holds the font but only a GPL `LICENSE`, so the OFL text must come from `neanes/sbmufl`. The licence file carries no copyright line; the font's own copyright string reads "Copyright (c) 2022, Daniel". Do not modify the font.

**Title font.** Lexend Deca (variable weight), used only for the title: `public/fonts/LexendDeca.ttf` and its licence `public/fonts/OFL-LexendDeca.txt`, downloaded unmodified from `ofl/lexenddeca/` in `github.com/google/fonts` at commit `e2332cf862ac3145c0ee5f24f04f4c1819b2410b` (upstream names `LexendDeca[wght].ttf` and `OFL.txt`). SHA-256: font `d11c12298f431d7e416a1e615d33f2c2b98bda2318a0c186c8c94f08c2d90ce8`, licence `5da8505887d0fa7fe963445fd58852707fda34adfeb65af25c99d152bab285bd`. Do not modify the font.

## 6. Look

Copy the layout and feel of default Monkeytype by eye, with no Monkeytype code or assets. Centred column, minimal chrome, system monospace stack for UI text, neumes in a wrapping row. The title reads "neumetype" (lower case, also the browser tab) in Lexend Deca, the typeface of Monkeytype's logo (owner decision 2026-11-28). Palette (approximate, recalled, not sourced): background `#323437`, accent/current `#e2b714`, untyped text (labels, stats) `#646669`, error `#ca4754`. Neume states (owner's choice, T13): done `#f2f1ea` (very bright), untyped `#4a4c50` (deliberately low contrast, close to the background), current `#e2b714`. Buttons keep `#d1d0c5`.

Favicon (owner's choice, 2026-11-28): Petastē with Ison (U+E040) in the accent colour on a rounded tile of the background colour, as `public/favicon.svg`. The glyph is stored as an outline taken from the unmodified Neanes font, because an SVG favicon cannot use the page's font.

## 7. Acceptance criteria

1. Keymap data has exactly 61 quantity entries that match Appendix A, and 29 Appendix B entries that match Appendix B (11 quality, 18 fthoras); chords and code point sequences are unique across all 90, and no trigger is also a modifier.
2. All 22 examples in section 4 pass as unit tests with no DOM.
3. A sampled test has the chosen length (10, 20 or 50; default 20) and never includes an `unverified` entry.
4. Scoring matches the section 3 example and formulas under a fake clock. The clock does not start on modifier presses and stops at the last neume of the chosen length.
5. In a real browser, Playwright completes a full test with real key events, including chords and one deliberate wrong chord, and the results show accuracy 95.2% (20/21).
6. In a real browser, `S` tapped and released then `L` counts as wrong on an `S + L` target, and held `S` then `L` counts as correct.
7. In a real browser, all code points of all 90 entries render from the Neanes font, not a fallback.
8. Restart gives a new test with zeroed clock and counts.
9. Type-check, ESLint, Vitest and Playwright all pass locally and in GitHub Actions.
10. The font and OFL files, for both fonts, match the SHA-256 values in section 5.
11. Human check: glyphs match the guide's Symbol column, and a full test feels playable.
12. The pitch and class of all 61 rows in `docs/neume-weights.md` equal the keymap's `pitch` and `frequency`, checked by a unit test that fails on any difference.
13. Chances sum to 1, none is below 0.25%, Ison is highest, and hand-calculated values hold, including a case where the floor needs more than one pass.
14. A seeded large sample draws each entry at about its chance, includes the rarest entry, and `random()` of 0 and just below 1 give the first and last pool entries.
15. Drill pools: `all` is every verified entry; `plain` has 28 entries and no letter modifier; R, S, D, F and B have 13, 5, 4, 7 and 4 entries; every drill pool is non-empty; an unknown drill throws. With the R drill every target of a full run uses R.
16. The hardest list ignores neumes with no errors, sorts by errors, then attempts, then id, and caps at 3. In a real browser a wrong key on a neume lists it with "1 error", and a clean run shows "No errors".
17. Saved progress: parsing null, invalid JSON, a wrong shape and a future version gives empty progress, and a future version is never overwritten; a throwing or missing storage does not throw; the best follows the rules in section 3c (per drill and length, ties by accuracy, never from practice runs or a null rate); the weakest list needs 3 attempts. In a real browser the best, the weakest panel (inside the results only) and the settings survive a reload, corrupt storage does not break the page, and reset clears the panel. The panel text meets 4.5:1 contrast.
18. Appendix B: every row matches the keymap; no entry is `unverified` (row 82 was verified by the owner on 2026-11-19); the default `all` drill is exactly the 61 quantity entries (so its chances and seeded draws are unchanged); the V drill has the 11 quality entries and the T drill all 18 fthoras, including row 82, which can be drawn; in a real browser each V and T target is typed with its own shortcut and all 90 code point sequences render from the Neanes font. Human check, done: the owner reported on 2026-11-26 that the glyphs have been checked.
19. Avoid repeats: off gives exactly the previous draw for a fixed seed; on never puts the same id twice in a row over many seeds and all drills, draws each later position at c_j / (1 - c_prev), uses one `random()` per target, and persists across reload together with the drill and length.
20. First visit and footer (section 3d): in a real browser the instruction shows above the neumes on a fresh browser and through an unfinished run, is gone after a finished run, restart and reload, and returns after a reset. The footer's three links have the stated targets and open in new tabs, the licence link serves the OFL text, both texts meet 4.5:1 contrast, and a 390 px screen has no sideways scroll. The licence link follows a non-root Vite base (unit test). On a 1280x600 screen the hint is fully visible after a first visitor's wrong key; with the longest hint at 1280, 600, 390 and 320 px it sits above the neumes without moving them; and late in a scrolled 50-neume test it is on screen and clear of the current neume.
21. Favicon (section 6): in a real browser the page links an SVG icon that is served; its corners are transparent, its tile is `--bg`, and its `--accent` shape overlaps U+E040 drawn by the bundled font (over 93%), unstretched and centred.
22. Title (sections 3 and 6): in a real browser the heading and tab read "neumetype", the title renders from the bundled Lexend Deca font, and clicking it during a test or on the results gives a new test with zeroed counts, without keeping focus.

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

## Appendix B: Characters of Quality and Fthoras

**Sources** (accessed 2026-11-18):

- Shortcuts, names, and code points as rendered in the Symbol column: https://neanes.github.io/neanes/guide/keyboard.html#characters-of-quality (rows 62 to 72) and https://neanes.github.io/neanes/guide/keyboard.html#fthoras (rows 73 to 90).
- Code point to glyph name: https://github.com/neanes/sbmufl/tree/13d7675d6070c87b83639a4ded6e3a2fb83df166/docs/tables (`quality.md`, `fthores.md`, `alteration.md`, `optional-glyphs.md`). A `.salt01` suffix is written `Salt01` in the id.
- Font cmap: every code point below is present in the bundled `Neanes.otf`.
- No Neanes application source was read.

**Rendering.** The guide's Symbol column is a sequence: a sample base neume (Ison U+E000 or Oligon U+E001) plus the mark. The marks have zero advance width and the font's own positioning places them. Each target shows that sequence, and the player types only the mark's shortcut (one attempt per target).

**Verified** means the guide row (name, shortcut, code points as rendered), the SBMuFL glyph name for that code point, and the font cmap all agree. Row 82 (U+E19B): the guide calls it "Soft Chromatic Ga fthora" but SBMuFL names that code point `fthoraSoftChromaticKeAbove`. The owner decided on 2026-11-19 that the glyph can be read on Ga or Ke and that the guide's Ga reading is used, so the row is verified and keeps the guide's name; the id stays the SBMuFL-derived one. Row 72's guide name says "above or below" but renders U+E0B1 `yfenBelow`. Not added: Characters of Temporal Augmentation, gorgons, martyrias and the rest. Not machine-checked: how each glyph looks (criterion 18). `Shift` means `ShiftLeft` or `ShiftRight`.

| # | Shortcut | `event.code` | Name | Code points | Mark glyph | Table | Status |
|---|---|---|---|---|---|---|---|
| 62 | `V` + `J` | KeyV + KeyJ | Vareia | U+E0A0 U+E000 | `vareia` | quality | verified |
| 63 | `V` + `K` | KeyV + KeyK | Psēfiston | U+E000 U+E0A1 | `psifiston` | quality | verified |
| 64 | `Shift` + `V` + `K` | Shift + KeyV + KeyK | Psēfiston (slanted) | U+E000 U+F006 | `psifiston.salt01` | quality | verified |
| 65 | `V` + `L` | KeyV + KeyL | Antikenoma | U+E001 U+E0A2 | `antikenoma` | quality | verified |
| 66 | `V` + `U` | KeyV + KeyU | Homalon | U+E001 U+E0A3 | `omalon` | quality | verified |
| 67 | `V` + `I` | KeyV + KeyI | Connecting Homalon | U+E000 U+E0A4 U+E000 | `omalonConnecting` | quality | verified |
| 68 | `V` + `N` | KeyV + KeyN | Heteron | U+E000 U+E0A5 | `heteron` | quality | verified |
| 69 | `V` + `M` | KeyV + KeyM | Connecting Heteron | U+E000 U+E0A6 U+E000 | `heteronConnecting` | quality | verified |
| 70 | `Shift` + `V` + `M` | Shift + KeyV + KeyM | Connecting Heteron (long) | U+E000 U+F007 U+E000 | `heteronConnecting.salt01` | quality | verified |
| 71 | `V` + `,` | KeyV + Comma | Endofonon | U+E000 U+E0A7 | `endofonon` | quality | verified |
| 72 | `V` + `.` | KeyV + Period | Yfen (above or below) | U+E000 U+E0B1 U+E000 | `yfenBelow` | quality | verified |
| 73 | `T` + `J` | KeyT + KeyJ | Diatonic Ni Low fthora | U+E000 U+E190 | `fthoraDiatonicNiLowAbove` | fthoras | verified |
| 74 | `T` + `K` | KeyT + KeyK | Diatonic Pa fthora | U+E000 U+E191 | `fthoraDiatonicPaAbove` | fthoras | verified |
| 75 | `T` + `L` | KeyT + KeyL | Diatonic Vou fthora | U+E000 U+E192 | `fthoraDiatonicVouAbove` | fthoras | verified |
| 76 | `T` + `;` | KeyT + Semicolon | Diatonic Ga fthora | U+E000 U+E193 | `fthoraDiatonicGaAbove` | fthoras | verified |
| 77 | `T` + `'` | KeyT + Quote | Diatonic Di fthora | U+E000 U+E194 | `fthoraDiatonicDiAbove` | fthoras | verified |
| 78 | `T` + `U` | KeyT + KeyU | Diatonic Ke fthora | U+E000 U+E195 | `fthoraDiatonicKeAbove` | fthoras | verified |
| 79 | `T` + `I` | KeyT + KeyI | Diatonic Zo fthora | U+E000 U+E196 | `fthoraDiatonicZoAbove` | fthoras | verified |
| 80 | `T` + `O` | KeyT + KeyO | Diatonic Ni High fthora | U+E000 U+E197 | `fthoraDiatonicNiHighAbove` | fthoras | verified |
| 81 | `T` + `N` | KeyT + KeyN | Soft Chromatic Di fthora | U+E000 U+E19A | `fthoraSoftChromaticDiAbove` | fthoras | verified |
| 82 | `T` + `M` | KeyT + KeyM | Soft Chromatic Ga fthora | U+E000 U+E19B | `fthoraSoftChromaticKeAbove` | fthoras | verified |
| 83 | `T` + `,` | KeyT + Comma | Hard Chromatic Pa fthora | U+E000 U+E198 | `fthoraHardChromaticPaAbove` | fthoras | verified |
| 84 | `T` + `.` | KeyT + Period | Hard Chromatic Di fthora | U+E000 U+E199 | `fthoraHardChromaticDiAbove` | fthoras | verified |
| 85 | `T` + `P` | KeyT + KeyP | Enharmonic fthora | U+E000 U+E19C | `fthoraEnharmonicAbove` | fthoras | verified |
| 86 | `T` + `[` | KeyT + BracketLeft | General Flat fthora | U+E000 U+E204 | `yfesisGenikiAbove` | fthoras | verified |
| 87 | `T` + `]` | KeyT + BracketRight | General Sharp fthora | U+E000 U+E1F4 | `diesisGenikiAbove` | fthoras | verified |
| 88 | `T` + `7` | KeyT + Digit7 | Zygos fthora | U+E000 U+E19D | `chroaZygosAbove` | fthoras | verified |
| 89 | `T` + `8` | KeyT + Digit8 | Kliton fthora | U+E000 U+E19E | `chroaKlitonAbove` | fthoras | verified |
| 90 | `T` + `9` | KeyT + Digit9 | Spathi fthora | U+E000 U+E19F | `chroaSpathiAbove` | fthoras | verified |
