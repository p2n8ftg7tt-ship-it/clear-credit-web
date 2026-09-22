# Implementation Plan: Credit Page Fixes — Phone Hyphens, No Repeated Address, Many Reported Identities

**Branch**: `005-credit-letter-fixes` (no git branch created) | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-credit-letter-fixes/spec.md`

## Summary

Three bugs found by manual testing of the credit report analyzer, each with its own acceptance criteria in the spec (AC-1.x, AC-2.x, AC-3.x). All three are fixed with plain-JavaScript changes in two existing files, with the rules moved into **pure functions** so they can be tested in Node (the inline script in `credito.html` is not testable today):

- **B1 — phone with hyphens.** Two pure functions in `cartas-bilingues.js` (`telefonoEscribiendo` for typing, `formatearTelefono` for output) plus one delegated `input` handler and new attributes on the phone field in `credito.html`. The detected-phones list and every letter use the same formatter, so `540-555-0142` is the only shape anywhere.
- **B2 — repeated address.** Delete the four split-address lines (`Calle y número`, `Ciudad`, `Estado`, `Código postal` and their English twins) from the `correcta` block of the identity letter; build the address once, cleanly, in `remitente()`.
- **B3 — many names, addresses, phones.** Every identity card now lists **all** detected values, grouped by type with counts and a per-group «Marcar todos» toggle (`agruparDetectados`); the letter lists exactly the ticked values in a fixed order (`ordenarDisputados`); card thresholds are unchanged and moved into a tested function (`tiposDeTarjeta`).

No new file in the site, no new dependency, no network call, no storage, no AI. Root causes and rejected alternatives are in [research.md](./research.md).

## Technical Context

**Language/Version**: Plain browser JavaScript. `cartas-bilingues.js` is ES5-style (`var`, IIFE) and stays so; the inline script in `credito.html` uses ES2017+ and keeps its style. Node 18+ (v24.21.0 installed) for tests. No transpilation.

**Primary Dependencies**: None new. Existing: `node:test`, the browser DOM, `ThemoraCartas` (`cartas-bilingues.js`).

**Storage**: N/A. Nothing persists; ticked boxes and typed fields live in the open form only.

**Testing**: `node --test tests/*.test.js` (baseline 2026-09-21: 245 pass, 0 fail). New tests go into `tests/cartas-bilingues.test.js` (functions and letters) and one new static-wiring file `tests/credito-identidad.test.js` (reads `credito.html` as text like `tests/formularios-direccion.test.js` does). Manual checks in [quickstart.md](./quickstart.md). Note the directory form `node --test tests/` fails at baseline on Node 24 (research R7).

**Target Platform**: Static site on Netlify (`publish = "."`); modern desktop and mobile browsers, tested at 360 px and 1280 px.

**Project Type**: Static multi-page website + serverless functions (no build step). This feature touches only the browser side.

**Performance Goals**: Phone formatting on each keystroke < 1 ms; grouping/de-duplicating up to a few hundred detected values < 50 ms; letter generation stays synchronous and local.

**Constraints**: No new external origin (CSP unchanged); nothing typed or detected leaves the browser; analytics stay `{tipo}` only; the English column never contains Spanish; LF line endings; the bureau-dispute and debt-validation letters change only in the phone format; existing tests are not weakened — only assertions that encode the old behavior (parenthesized phone in the disputed line, the four split-address labels) are updated, and each such change is listed in the tasks.

**Scale/Scope**: 2 source files edited (`credito.html`, `cartas-bilingues.js`), 1 test file extended, 1 test file added, `INSTRUCCIONES-CARTAS-BILINGUES.md` updated (letter structure + phone rule). 6 new exported functions. No change to `netlify.toml`, `privacidad.html`, functions or the database.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see the second table.*

| Principle / rule | Assessment | Status |
|---|---|---|
| **I. Honestidad y no asesoría** | No legal text is added or changed; the only text removed is redundant data lines. Existing test forbids «es ilegal / debes / garantiza» in both languages and keeps running. Validation message and group labels are neutral. | PASS |
| **II. Privacidad por diseño** | Nothing new is sent anywhere. Detected values stay in page memory; analytics get the same `{tipo}` event and never a count or a value (AC-3.14; quickstart step 4.7 checks the network panel). | PASS |
| **III. Funciona sin IA** | No AI involved. If `ThemoraCartas` fails to load, the detected list falls back to the flat list and the existing «No pudimos preparar la carta» message still shows (research R6). | PASS |
| **IV. Una sola verdad, probada** | One phone formatter used by input, list and letters; one place builds the address; grouping/ordering/card rules are pure and tested; Spanish and English blocks stay the same length and are compared by the existing parity tests, extended for the new invariants. | PASS |
| **V. Multilingüe con revisión humana** | New Spanish UI strings only (group headings, toggle, phone message). The English letter loses lines and gains none; its `TODO(NATIVE_REVIEW)` status is unchanged and recorded in spec 003. | PASS (review still pending, tracked) |
| **Static site, no build; no new dependency** | Plain files only; no library for masking or testing (research R1, R5). | PASS |
| **Everything at the root is published → block internal files** | No new file at the root. `specs/` is already blocked (`/specs/*` in `netlify.toml`). | PASS |
| **Secrets outside the code / session check + rate limit** | No function, key or paid call involved. | N/A |
| **Browser security headers / CSP** | No new origin, script source or inline event handler; the inline script already exists and is covered by the current CSP. | PASS |
| **Tests (`node --test tests/`) MUST pass** | Required before publish; the command form must be `node --test tests/*.test.js` on this Node version (R7). A failure is reported as is. | PASS (with note) |
| **LF line endings** | Edit files preserving LF; verify with `git diff --stat` (quickstart §5). | PASS (verify) |
| **Docs beside the change** | `INSTRUCCIONES-CARTAS-BILINGUES.md` updated for the new block layout and phone rule. No user-visible function needs new configuration. | PASS |
| **Graph** | Run `graphify update .` after code changes; the command currently fails on this machine (missing Python path) — report, do not skip silently. | TODO at implementation |

**Gate result (pre-research)**: PASS. No unjustified violations.

### Post-design re-check (after data-model, contracts, quickstart)

| Item | Result |
|---|---|
| New exported functions are pure and tested (IV) | Yes — contract lists the 5 invariants the tests enforce. |
| New markup adds no HTML from user data | Yes — values escaped as text; the JSON in `value` keeps the current shape. |
| Any new network/storage/analytics field (II) | No. |
| English text added without review (V) | None added; two English lines' worth of labels removed. |
| Existing letters unchanged where the spec says so (FR-012) | Yes — only the phone format differs in the two other letters; a test compares their blocks against the previous structure. |

**Gate result (post-design)**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/005-credit-letter-fixes/
├── spec.md                    # Bugs, diagnosis, assumptions, user stories, acceptance criteria (AC-1.x/2.x/3.x)
├── plan.md                    # This file
├── research.md                # Phase 0: decisions R1–R9 with alternatives
├── data-model.md              # Phase 1: phone, sender, detected value, groups, block `correcta`
├── quickstart.md              # Phase 1: 10-minute manual verification + test command
├── contracts/
│   └── letters-module.md      # Phase 1: new ThemoraCartas exports, changed letter output, list markup
└── tasks.md                   # Phase 2 — NOT created by this command (/speckit-tasks)
```

### Source Code (repository root)

```text
cartas-bilingues.js            # EDIT: +telefonoEscribiendo, +formatearTelefono, +telefonoValido,
                               #       +agruparDetectados, +tiposDeTarjeta, +ordenarDisputados,
                               #       remitente() builds phone/address once, cartaIdentidad() `correcta`
                               #       drops the 4 split-address lines and `disputados` uses ordenarDisputados
credito.html                   # EDIT: phone field attributes; delegated `input` handler; identityDisplayValue
                               #       (phones → hyphens); detectedOptionsHtml (groups + toggle); the
                               #       identity addNegative calls give every card the full list;
                               #       small CSS for .cr-detected-group / .cr-detected-toggle
INSTRUCCIONES-CARTAS-BILINGUES.md  # EDIT: new `correcta` layout and phone rule
tests/
├── cartas-bilingues.test.js   # EDIT: update 2 assertions that encode old behavior; add tests for AC-1.1–1.9, 2.1–2.8, 3.1–3.9
└── credito-identidad.test.js  # NEW: static wiring checks on credito.html (phone attributes, groups, no type-only lists)
```

**Structure Decision**: Keep the existing two-file layout (page = wiring, `cartas-bilingues.js` = rules and letter text). No new site file, so nothing new needs a 404 rule in `netlify.toml`.

## Acceptance-criteria traceability

Each acceptance criterion in the spec maps to how it will be checked. `T` = Node test, `M` = manual step in the quickstart.

| Bug | Criteria | Checked by |
|---|---|---|
| B1 phone | AC-1.1, 1.2, 1.3, 1.4, 1.8 | T (`telefonoEscribiendo` table of inputs → outputs) + M §2 steps 2–3 (caret, paste, autofill) |
| | AC-1.5 | T (`telefonoValido`) + static test (`pattern`/`title`/`required` on the field) + M §2 step 4 |
| | AC-1.6 | T (`agruparDetectados` returns hyphenated phones) + M §2 step 5 |
| | AC-1.7, 1.9 | T (every phone in each of the 3 letters × es/en matches `\d{3}-\d{3}-\d{4}`; raw `5405550142` and `(540) 555-0142` inputs) |
| | AC-1.10 | Static test (label text and `placeholder` present) + M |
| B2 address | AC-2.1, 2.2, 2.3, 2.5, 2.6 | T (block `correcta`: 7 lines, no split labels, one address line, all 4 subtypes, messy spacing) |
| | AC-2.4 | T (street text count ≤ 2 per language) |
| | AC-2.7 | T (same number of lines per block in es/en; existing parity and no-Spanish-in-English tests) |
| | AC-2.8 | T (`textoEn` has one address line) + M §3 step 4 |
| | AC-2.9 | T (bureau-dispute and debt-validation block ids/lines unchanged except phone) |
| B3 many | AC-3.1, 3.2, 3.5 | T (`agruparDetectados` with N/M/P ∈ {0, 1, 5, 10}, duplicates in case/format) |
| | AC-3.3, 3.4 | T (`tiposDeTarjeta` truth table) + static test (every identity `addNegative` receives the full list) + M §4 step 5 |
| | AC-3.6, 3.7, 3.12 | Static test (markup: fieldset/legend/toggle, no `checked`) + M §4 steps 1–2 |
| | AC-3.8, 3.9, 3.10 | T (`disputados` has K lines, fixed order, unticked value absent, own data never added) |
| | AC-3.11 | Existing behavior kept; static test that the message remains + M §4 step 4 |
| | AC-3.13 | M §4 step 6 |
| | AC-3.14 | Static test (no new `fetch`/`ThemoraStats.evento` argument) + M §4 step 7 |
| | AC-3.15 | Existing detection tests keep passing (no change to extraction) |

## Risks and how the plan handles them

| Risk | Handling |
|---|---|
| Reformatting on `input` moves the caret or fights autofill | Caret restored by counting digits before it; same handler covers autofill; manual check in quickstart §2. |
| Each of up to three identity cards now shows the same long list | Accepted (research R4): each card keeps its own letter subject. If it feels heavy in use, a follow-up can merge the cards; this does not block the fixes. |
| Existing tests encode the old behavior | Only three assertions changed, all because the phone format changed on purpose (`HECHOS_REMITENTE`, the disputed-phone line, the disputed-phone fact in `casos()`); no test about the address block existed to change. No test is loosened otherwise. |
| `identityDisplayValue` runs before `cartas-bilingues.js` is loaded | It only runs at analysis time (user click), after all scripts are loaded; a fallback keeps the flat list if the module is missing (R6). |
| A phone that is not a 10-digit US number is now rejected at submit | Documented in A2 and shown with a clear Spanish message; the owner can relax it later. Non-US numbers are out of scope. |

## Complexity Tracking

| Deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Report-side helpers (`agruparDetectados`, `tiposDeTarjeta`) live in the *letters* module | They must be testable in Node and the page already loads this module; the letters also need the same phone formatter | A new shared file adds a script tag and a cross-module dependency for six small functions; the header comment of `cartas-bilingues.js` is updated to say it also holds the identity-list rules |
| `node --test tests/*.test.js` instead of `node --test tests/` | The directory form fails on the installed Node (pre-existing) | Editing the constitution is a separate PATCH amendment, not part of this fix; reported to the owner |

No other deviation from the constitution.

## Open Questions (do not block implementation; defaults applied)

- **Q1**: Several *correct* addresses/phones per person? Default: no (one each).
- **Q2**: Apply the no-repetition rule to **MI INFORMACIÓN** in the other two letters? Default: no.

## Next step

Run `/speckit-tasks` to generate `tasks.md` from this plan. After answering Q1/Q2 (or accepting the defaults), `/speckit-implement` can start with User Story 2 (smallest change), then 1, then 3.
