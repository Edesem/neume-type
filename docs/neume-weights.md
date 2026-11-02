# Neume weights

Owner-checked source for the Pitch and Class columns, as of 2026-11-03. The app reads the same values from `src/data/keymap.ts`, and a unit test fails if the two disagree. Edit both together. Background and rules: SPEC section 3a.

Class is common, uncommon or fixed. Rest, Cross and Breath have no pitch and are fixed.

**Formula** (constants in `src/core/weights.ts`)

- Raw weight = 0.5^|pitch|, times 0.25 if uncommon. Fixed entries have raw weight 0.02. This is the Weight column.
- Chance = raw weight divided by the total of all 61 raw weights, as a share of each draw.
- Floor: every entry gets at least 0.25% per draw. Any entry below it gets exactly 0.25%, and the others are scaled proportionally so the total is 100%. This repeats until no entry is below the floor, since scaling can push another entry under it. In this table 22 entries sit at the floor, so Chance is not simply Weight over the total.

| # | Shortcut | Name | Pitch | Class | Weight | Chance | Pitch status |
|---|---|---|---|---|---|---|---|
| 1 | `J` | Ison | 0 | common | 1 | 11.63% | sourced |
| 2 | `K` | Oligon | +1 | common | 0.5 | 5.82% | sourced |
| 3 | `L` | Oligon with Kentēma (below) | +2 | common | 0.25 | 2.91% | verified |
| 4 | `S + L` | Oligon with Kentēma | +2 | common | 0.25 | 2.91% | verified |
| 5 | `;` | Oligon with Kentēma (above) | +3 | common | 0.125 | 1.45% | verified |
| 6 | `'` | Oligon with Ypsēlē (right) | +4 | common | 0.0625 | 0.73% | verified |
| 7 | `U` | Oligon with Ypsēlē (left) | +5 | uncommon | 0.007813 | 0.25% | verified |
| 8 | `I` | Oligon with Ypsēlē and Kentēma (horizontal) | +6 | uncommon | 0.003906 | 0.25% | verified |
| 9 | `O` | Oligon with Ypsēlē and Kentēma (vertical) | +7 | uncommon | 0.001953 | 0.25% | verified |
| 10 | `P` | Oligon with Double Ypsēlē | +8 | uncommon | 0.0009766 | 0.25% | verified |
| 11 | `Shift + J` | Petastē with Ison | 0 | uncommon | 0.25 | 2.91% | verified |
| 12 | `Shift + K` | Petastē | +1 | common | 0.5 | 5.82% | sourced |
| 13 | `Shift + L` | Petastē with Oligon | +2 | uncommon | 0.0625 | 0.73% | verified |
| 14 | `Shift + ;` | Petastē with Kentēma (above) | +3 | uncommon | 0.03125 | 0.36% | verified |
| 15 | `Shift + '` | Petastē with Ypsēlē (right) | +4 | uncommon | 0.01563 | 0.25% | verified |
| 16 | `Shift + U` | Petastē with Ypsēlē (left) | +5 | uncommon | 0.007813 | 0.25% | verified |
| 17 | `Shift + I` | Petastē with Ypsēlē and Kentēma (horizontal) | +6 | uncommon | 0.003906 | 0.25% | verified |
| 18 | `Shift + O` | Petastē with Ypsēlē and Kentēma (vertical) | +7 | uncommon | 0.001953 | 0.25% | verified |
| 19 | `Shift + P` | Petastē with Double Ypsēlē | +8 | uncommon | 0.0009766 | 0.25% | verified |
| 20 | `N` | Apostrophos | -1 | common | 0.5 | 5.82% | sourced |
| 21 | `S + N` | Ison and Apostrophos | -1 | common | 0.5 | 5.82% | verified |
| 22 | `M` | Elaphron | -2 | common | 0.25 | 2.91% | verified |
| 23 | `F + M` | Running Elaphron | -3 | common | 0.125 | 1.45% | verified |
| 24 | `D + M` | Yporroē | -2 | common | 0.25 | 2.91% | verified |
| 25 | `S + M` | Double Apostrophos | -2 | common | 0.25 | 2.91% | verified |
| 26 | `,` | Elaphron with Apostrophos | -3 | common | 0.125 | 1.45% | verified |
| 27 | `.` | Hamēlē | -4 | common | 0.0625 | 0.73% | verified |
| 28 | `/` | Hamēlē with Apostrophos | -5 | uncommon | 0.007813 | 0.25% | verified |
| 29 | `S + /` | Hamēlē with Elaphron | -6 | uncommon | 0.003906 | 0.25% | verified |
| 30 | `D + /` | Hamēlē with Elaphron and Apostrophos | -7 | uncommon | 0.001953 | 0.25% | verified |
| 31 | `F + /` | Double Hamēlē | -8 | uncommon | 0.0009766 | 0.25% | verified |
| 32 | `Shift + N` | Petastē with Apostrophos | -1 | uncommon | 0.125 | 1.45% | verified |
| 33 | `Shift + M` | Petastē with Elaphron | -2 | uncommon | 0.0625 | 0.73% | verified |
| 34 | `Shift + S + M` | Petastē with Running Elaphron | -3 | uncommon | 0.03125 | 0.36% | verified |
| 35 | `Shift + D + M` | Petastē with Yporroē | -2 | uncommon | 0.0625 | 0.73% | verified |
| 36 | `Shift + ,` | Petastē with Elaphron and Apostrophos | -3 | uncommon | 0.03125 | 0.36% | verified |
| 37 | `R + ;` | Kentēmata | +1 | common | 0.5 | 5.82% | verified |
| 38 | `R + J` | Ison and Kentēmata with Supporting Oligon | +1 | common | 0.5 | 5.82% | verified |
| 39 | `R + K` | Oligon and Kentēmata | +2 | common | 0.25 | 2.91% | verified |
| 40 | `Shift + R + K` | Kentēmata and Oligon | +2 | common | 0.25 | 2.91% | verified |
| 41 | `R + L` | Oligon with Kentēma and Kentēmata | +3 | uncommon | 0.03125 | 0.36% | verified |
| 42 | `R + '` | Oligon with Ypsēlē and Kentēmata (right) | +5 | uncommon | 0.007813 | 0.25% | verified |
| 43 | `R + U` | Oligon with Ypsēlē and Kentēmata (left) | +6 | uncommon | 0.003906 | 0.25% | verified |
| 44 | `R + N` | Apostrophos and Kentēmata with Supporting Oligon | 0 | uncommon | 0.25 | 2.91% | verified |
| 45 | `R + M` | Elaphron and Kentēmata with Supporting Oligon | -1 | uncommon | 0.125 | 1.45% | verified |
| 46 | `Shift + R + M` | Running Elaphron and Kentēmata with Supporting Oligon | -2 | uncommon | 0.0625 | 0.73% | verified |
| 47 | `R + ,` | Elaphron with Apostrophos and Kentēmata with Supporting Oligon | -2 | uncommon | 0.0625 | 0.73% | verified |
| 48 | `R + .` | Hamēlē and Kentēmata with Supporting Oligon | -3 | uncommon | 0.03125 | 0.36% | verified |
| 49 | `R + /` | Yporroē and Kentēmata with Supporting Oligon | -1 | uncommon | 0.125 | 1.45% | verified |
| 50 | `Shift + F + J` | Ison with Supporting Oligon | 0 | uncommon | 0.25 | 2.91% | verified |
| 51 | `Shift + F + N` | Apostrophos with Supporting Oligon | -1 | uncommon | 0.125 | 1.45% | verified |
| 52 | `Shift + F + M` | Elaphron with Supporting Oligon | -2 | uncommon | 0.0625 | 0.73% | verified |
| 53 | `Shift + D + /` | Yporroē with Supporting Oligon | -2 | uncommon | 0.0625 | 0.73% | verified |
| 54 | `Shift + F + ,` | Elaphron with Apostrophos and Supporting Oligon | -3 | uncommon | 0.03125 | 0.36% | verified |
| 55 | `Shift + F + .` | Hamēlē with Supporting Oligon | -4 | uncommon | 0.01563 | 0.25% | verified |
| 56 | `Shift + B + J` | Rest (1 beat) | none | fixed | 0.02 | 0.25% | n/a |
| 57 | `Shift + B + K` | Rest (2 beats) | none | fixed | 0.02 | 0.25% | n/a |
| 58 | `Shift + B + L` | Rest (3 beats) | none | fixed | 0.02 | 0.25% | n/a |
| 59 | `Shift + B + ;` | Rest (4 beats) | none | fixed | 0.02 | 0.25% | n/a |
| 60 | `Shift + =` | Cross | none | fixed | 0.02 | 0.25% | n/a |
| 61 | `=` | Breath | none | fixed | 0.02 | 0.25% | n/a |
