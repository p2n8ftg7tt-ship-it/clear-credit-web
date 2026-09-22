---

description: "Task list for 005-credit-letter-fixes (phone hyphens, no repeated address, many reported identities)"
---

# Tasks: Credit Page Fixes — Phone Hyphens, No Repeated Address, Many Reported Identities

**Input**: Design documents from `/specs/005-credit-letter-fixes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/letters-module.md](./contracts/letters-module.md), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The constitution (Principle IV, "Pruebas") requires tests for any logic with rules, and SC-004 requires a test per acceptance criterion that can run without a browser. Each story writes its tests first and confirms they fail (red) before implementing.

**Organization**: Grouped by user story. US1 (phone) and US2 (address) are independent of each other and can be done in either order; US3 (many identities) needs the phone formatter from US1. The story labels follow the spec, not the order of work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 = phone hyphens, US2 = address not repeated, US3 = many names/addresses/phones
- Test command everywhere: `node --test tests/*.test.js` (the directory form `node --test tests/` fails on Node 24 — research R7). Baseline before any change: **245 pass, 0 fail**.

## Path Conventions

Static site at the repo root, no build step. Files touched: `cartas-bilingues.js`, `credito.html`, `tests/cartas-bilingues.test.js`, `tests/credito-identidad.test.js` (new), `tests/fixtures/cartas-antes-005.json` (new), `INSTRUCCIONES-CARTAS-BILINGUES.md`. Edit with LF line endings; do not reformat unrelated lines.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the baseline so regressions are visible.

- [X] T001 Run `node --test tests/*.test.js` from the repo root and confirm 245 pass, 0 fail; write down `git diff --stat -- credito.html` (it already has uncommitted changes: 408 insertions, 352 deletions at plan time) so the final diff can be compared, and confirm `cartas-bilingues.js` and `credito.html` have no CRLF (`grep -cP '\r$' <file>` prints 0).
- [X] T002 Before editing anything, write `tests/fixtures/cartas-antes-005.json` with the CURRENT output of the bureau-dispute and debt-validation letters: run a one-off `node -e` that loads `cartas-bilingues.js` (with `global.window = {}`) and calls `armar('bureau-dispute', …)` for the six reasons in `MOTIVOS` (`not-mine`, `wrong-amount`, `wrong-date`, `already-resolved`, `wrong-status`, `other`) and `armar('debt-validation', …)` with and without `referencia`, using the same inputs as `tests/cartas-bilingues.test.js` (`FECHA`, `BURO`, `COBRADOR`) but with `currentPhone: '540-555-0142'` (already hyphenated, so the phone change is a no-op) and store each result's `bloques` (id, es, en). This is the "before" picture for AC-2.9 / FR-012. `/tests/*` is already blocked in `netlify.toml` (line 102), so the fixture is not published.

**Checkpoint**: Baseline green and the "before" fixture exists.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The two things every story touches.

**⚠️ CRITICAL**: Finish before any user story.

- [X] T003 In `cartas-bilingues.js`, update the header comment to say the file also holds the identity-list and phone rules (plan "Complexity Tracking"), and add a clearly labeled section `/* ---------- datos personales del reporte y teléfono ---------- */` between the utilities and the letters where the new functions will go. No behavior change; the existing suite must still pass.
- [X] T004 [P] Create `tests/credito-identidad.test.js` (new file) with the `node:test` + `node:assert` boilerplate, a helper `leerCredito()` that reads `credito.html` as UTF-8 text (same technique as `tests/formularios-direccion.test.js`), and one smoke test asserting the file contains `personalFieldsHtml`, `detectedOptionsHtml` and `submitIdentityCorrection`. Header comment in Spanish like the other test files, citing this spec.

**Checkpoint**: Foundation ready; user stories can start.

---

## Phase 3: User Story 1 - The phone number is shown and written with hyphens (Priority: P1) 🎯

**Goal**: `540-555-0142` is the only phone shape: while typing, in the detected-phones list, and in all three letters (spec AC-1.1 – AC-1.10).

**Independent Test**: [quickstart.md §2](./quickstart.md). In any letter form type `5405550142`, `(540) 555-0142`, `540.555.0142`: each becomes `540-555-0142`; every phone in the generated letter (both columns and the copied English text) is `540-555-0142`.

### Tests for User Story 1 (write first, confirm they FAIL)

- [X] T005 [US1] In `tests/cartas-bilingues.test.js` add a table-driven test for `C.telefonoEscribiendo` (data-model §1): typing `5405550142` one digit at a time gives `5`, `54`, `540`, `540-5`, `540-55`, `540-555`, `540-555-0`, `540-555-01`, `540-555-014`, `540-555-0142`; `(540) 555-0142`, `540.555.0142`, `540 555 0142`, `+1 540 555 0142`, `15405550142` all give `540-555-0142`; letters and symbols are dropped (`54a0-b555` → `540-555`); more than 10 digits is capped (`54055501429999` → `540-555-0142`); `''`, `null`, `undefined` → `''`. Add tests for `C.formatearTelefono` (10 digits → `XXX-XXX-XXXX`; `54055` → `54055` unchanged; `'  abc '` → `abc`; 11 digits starting with 1 → dropped) and `C.telefonoValido` (true only for exactly 10 digits after the rule; false for 7, 9, empty). AC-1.1–1.5, 1.9.
- [X] T006 [US1] In `tests/cartas-bilingues.test.js` update the two assertions that encode the old phone shape and add letter coverage: change `HECHOS_REMITENTE` (line ~49) from `'(540) 555-0142'` to `'540-555-0142'` while `REMITENTE.currentPhone` stays `'(540) 555-0142'` (so the test proves normalization); change the disputed-phone assertion (line ~149) from `(540) 555-0000` to `- Teléfono: 540-555-0000` / `- Phone: 540-555-0000` while `DISPUTADOS` keeps the raw `'(540) 555-0000'`; add a test that for every letter in `casos()` and both languages, every phone-looking token matches `^\d{3}-\d{3}-\d{4}$` and the text contains no `(540)`; add a test with `currentPhone: '5405550142'` giving `540-555-0142`; add a test that a 7-digit phone is printed unchanged (never invented). AC-1.7, 1.9, SC-001. Reason for editing existing assertions: the spec deliberately changes the phone format.
- [X] T007 [P] [US1] In `tests/credito-identidad.test.js` add static tests on `credito.html`: the phone input (`name="currentPhone"`) has `type="tel"`, `inputmode="tel"`, `autocomplete="tel"`, `maxlength="20"`, `placeholder="540-555-0142"`, `pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"`, `title="Escribe un teléfono de 10 dígitos, como 540-555-0142."`, `required`, and its label still reads `Número de teléfono actual` (AC-1.5, 1.10); the file has an `input` listener that reads `currentPhone` and calls `telefonoEscribiendo`; `identityDisplayValue` calls `formatearTelefono`; each of the three submit functions checks `telefonoValido`.
- [X] T008 [US1] Run `node --test tests/*.test.js`; confirm the new US1 tests FAIL for the right reason (missing functions / old markup) and nothing else regressed.

### Implementation for User Story 1

- [X] T009 [US1] In `cartas-bilingues.js` (section from T003) implement and export `telefonoEscribiendo(valor)`, `formatearTelefono(valor)` and `telefonoValido(valor)` exactly as in data-model §1 and contracts/letters-module.md: digits only; drop one leading `1` ONLY when exactly 11 digits are present; keep at most 10; progressive hyphens (`XXX`, `XXX-X…`, `XXX-XXX`, `XXX-XXX-X…`); `formatearTelefono` returns the trimmed original when the value is not 10 digits. ES5 style (`var`, no arrow functions).
- [X] T010 [US1] In `cartas-bilingues.js` make `remitente()` set `phone: formatearTelefono(r.currentPhone)`, and in `cartaIdentidad()` run each disputed value whose type is `Teléfono` through `formatearTelefono` in BOTH the Spanish and English `disputados` lines. The bureau-dispute and debt-validation letters get the new phone only through `remitente()`.
- [X] T011 [US1] In `credito.html` `personalFieldsHtml()` change the phone field to: `type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="540-555-0142" pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" title="Escribe un teléfono de 10 dígitos, como 540-555-0142." required` (was `maxlength="30"`); keep `name="currentPhone"` and the label «Número de teléfono actual».
- [X] T012 [US1] In `credito.html` change `identityDisplayValue(type,value)` so the `Teléfono` branch returns `window.ThemoraCartas.formatearTelefono(value)`, with the current 10-digit slicing kept as a fallback WITHOUT parentheses (`ddd-ddd-dddd`) if `window.ThemoraCartas` is missing (research R6).
- [X] T013 [US1] In `credito.html`, next to the existing `results.addEventListener('click', …)` / `submit` listeners, add ONE delegated `input` listener (and a `change` listener for browser autofill) on `results` for inputs whose `name` is `currentPhone`: count the digits before the caret, set `input.value = window.ThemoraCartas.telefonoEscribiendo(input.value)`, and restore the caret after the same number of digits so editing in the middle does not jump to the end (AC-1.1, 1.8, research R2). Do nothing if `ThemoraCartas` is missing.
- [X] T014 [US1] In `credito.html` add a small helper `phoneIsValid(form, formData, formAlert)` that, when `!ThemoraCartas.telefonoValido(currentPhone)`, sets the alert text «Escribe un teléfono de 10 dígitos, como 540-555-0142.», shows it, focuses the `currentPhone` input and returns `false`; call it in `submitIdentityCorrection`, `submitBureauDispute` and `submitDebtValidation` right after `readPersonalInfo`'s inputs are read and before building the letter (JS backstop to the native `pattern`, AC-1.5).
- [X] T015 [US1] Run `node --test tests/*.test.js` (all green, including T005–T007), then do quickstart §2 steps 1–6 in a browser (typing, caret in the middle, paste variants, letters rejected, `54055` blocked with focus, detected phones hyphenated, all three letter types). **[Node tests and simulated handler checks done; the real-browser walk-through of quickstart §2 is pending — needs the owner.]**

**Checkpoint**: US1 works and is testable on its own.

---

## Phase 4: User Story 2 - "My correct information" no longer repeats the address (Priority: P1)

**Goal**: In the identity letter the address is one line in the correct-information block, in both languages (AC-2.1 – AC-2.9).

**Independent Test**: [quickstart.md §3](./quickstart.md). Generate an identity letter with street `742 Evergreen Terrace`, city `Roanoke`, state `VA`, ZIP `24016`: the block «MI INFORMACIÓN CORRECTA» / «MY CORRECT INFORMATION» has 7 lines, one address line, and none of `Calle y número`, `Ciudad`, `Estado`, `Código postal`, `Street and number`, `City`, `State`, `ZIP code`.

### Tests for User Story 2 (write first, confirm they FAIL)

- [X] T016 [US2] In `tests/cartas-bilingues.test.js` add tests on the identity letter for all four subtypes in `SUBTIPOS`: the block `correcta` has exactly the 7 lines of data-model §7 in both languages in that order (title, legal name, given names, first surname, second surname or `No aplica` / `N/A`, ONE address line `…: 742 Evergreen Terrace, Roanoke, VA 24016`, phone); none of the removed labels appear inside that block (`Calle y número:`, `Ciudad:`, `Estado:`, `Código postal:`, `Street and number:`, `City:`, `State:`, `ZIP code:`); `742 Evergreen Terrace` appears at most twice in the whole letter per language; Spanish and English `correcta` have the same number of lines; `textoEn` has exactly one line starting `Current address:`. AC-2.1–2.4, 2.6–2.8.
- [X] T017 [US2] In `tests/cartas-bilingues.test.js` add tests for address building: input with extra spaces (`street: '  742   Evergreen  Terrace '`, `city: ' Roanoke '`, `state: ' VA'`, `postalCode: '24016 '`) prints `742 Evergreen Terrace, Roanoke, VA 24016`; an empty state or ZIP gives no `, ,` and no trailing comma or space; the free-text «Detalle adicional» test that requires verbatim text (existing) still passes unchanged. AC-2.5.
- [X] T018 [US2] In `tests/cartas-bilingues.test.js` add a test that loads `tests/fixtures/cartas-antes-005.json` (T002) and asserts the bureau-dispute (six reasons) and debt-validation (with and without reference) letters generated now have the same block ids and the same `es`/`en` lines as the fixture. AC-2.9, FR-012.
- [X] T019 [US2] Run `node --test tests/*.test.js`; confirm T016–T017 FAIL (split lines still present) and T018 PASSES (it is a guard, green now and must stay green).

### Implementation for User Story 2

- [X] T020 [US2] In `cartas-bilingues.js` add `limpio(x)` next to `texto()` (`texto(x)` then collapse runs of whitespace to one space; do NOT change `texto()` itself, because «Detalle adicional» must stay verbatim — research R3). In `remitente()` clean `street`, `city`, `state`, `postalCode` with `limpio()` and build `address` as `[street, city, (state + ' ' + postalCode).trim()]` with empty parts removed, joined with `', '`.
- [X] T021 [US2] In `cartas-bilingues.js` `cartaIdentidad()` block `correcta`, delete the four split-address lines from BOTH the Spanish array (`'Calle y número: …'`, `'Ciudad: …'`, `'Estado: …'`, `'Código postal: …'`) and the English array (`'Street and number: …'`, `'City: …'`, `'State: …'`, `'ZIP code: …'`), keeping title, legal name, given name(s), first surname, second surname, `Dirección actual` / `Current address`, and the phone line, in that order. Do not touch the `mi-informacion` blocks of the other two letters (spec A5/Q2).
- [X] T022 [US2] Run `node --test tests/*.test.js` (all green, T018 still green), then do quickstart §3 steps 1–5 in a browser, including the copy button and the two other letters. **[Tests done; real-browser walk-through of quickstart §3 pending — needs the owner.]**

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - A report with many names, addresses and phones can be fully reviewed and disputed (Priority: P2)

**Goal**: Every identity card lists all detected values grouped by type with counts; the person ticks the wrong ones (individually or per group); the letter lists exactly those, grouped names → addresses → phones (AC-3.1 – AC-3.15).

**Independent Test**: [quickstart.md §4](./quickstart.md). With a report listing 3 names, 2 addresses and 3 phones: the identity card shows «Nombres (3)», «Direcciones (2)», «Teléfonos (3)», nothing ticked; ticking one address, one name and one phone produces a letter with exactly those 3 lines in the order name → address → phone.

**Depends on**: T009 (`formatearTelefono`) from US1.

### Tests for User Story 3 (write first, confirm they FAIL)

- [X] T023 [US3] In `tests/cartas-bilingues.test.js` add tests for `C.agruparDetectados` (data-model §4): for N names, M addresses, P phones with each of N, M, P in {0, 1, 5, 10} the result has exactly N + M + P values in total (SC-003); groups come in the order `nombres`, `direcciones`, `telefonos` with `titulo` `Nombres` / `Direcciones` / `Teléfonos` and empty groups are omitted; `Nombre` and `Nombre o alias` both go to `nombres`; an unknown type goes to a last group `otros` titled `Otros datos` and is not dropped; duplicates that differ only by case or spacing (`MARIA GARCIA` / `Maria  Garcia`, same address with different spacing) appear once and phones are de-duplicated by digits (`(540) 555-0000` = `540.555.0000`); phone values come out hyphenated; order inside a group is first-seen; the input array is not mutated. AC-3.1, 3.2, 3.5, 1.6.
- [X] T024 [US3] In `tests/cartas-bilingues.test.js` add a truth table for `C.tiposDeTarjeta({nombres, direcciones, telefonos})` (data-model §5): `(1,1,1)` → `[]`; `(0,0,0)` → `[]`; `(2,0,0)` → `['identity-names']`; `(0,2,0)` → `['identity-addresses']`; `(0,0,2)` → `['identity-phones']`; `(3,1,2)` → `['identity-names','identity-phones']`; `(2,2,2)` → `['identity-names','identity-phones','identity-addresses','identity-mixed']`. AC-3.3, 3.4.
- [X] T025 [US3] In `tests/cartas-bilingues.test.js` add tests for `C.ordenarDisputados` and the identity letter's `disputados` block: values given in the order phone, name, address, name are listed name, name, address, phone (stable inside a group); `disputados` has exactly K lines for K ticked values (try K = 1, 3, 8), in both languages and in the same order; an unticked value and the person's own name/address/phone never appear as disputed lines; unknown types go last; the input array is not mutated. AC-3.8–3.10.
- [X] T026 [P] [US3] In `tests/credito-identidad.test.js` add static tests on `credito.html`: `detectedOptionsHtml` calls `agruparDetectados`, emits one `fieldset` with class `cr-detected-group` per group with a `legend` containing the count, emits a `cr-detected-toggle` button only for groups with 2 or more values, and emits no `checked` attribute (AC-3.2, 3.6, 3.7, 3.12); every `identity-*` `addNegative` call receives `allDetectedIdentity` and none receives only `detectedNames`, `detectedPhones` or `detectedAddresses` (AC-3.3); the analyzer uses `tiposDeTarjeta`; the message «Marca por lo menos un nombre, teléfono o dirección incorrectos para incluirlos en la carta.» is still present (AC-3.11); `carta-generada` is still called with only `{tipo:type}` and no new `fetch(` was added (AC-3.14).
- [X] T027 [US3] Run `node --test tests/*.test.js`; confirm T023–T026 FAIL for the right reasons and nothing else regressed.

### Implementation for User Story 3

- [X] T028 [US3] In `cartas-bilingues.js` implement and export `agruparDetectados(valores)` per data-model §3–4 and contracts/letters-module.md: de-duplicate inside each type (lower-case with collapsed spaces for names and addresses, digits for phones), keep first-seen order, pass phones through `formatearTelefono`, group into `nombres` / `direcciones` / `telefonos` / `otros`, drop empty groups, never mutate the input, return `[{clave, titulo, valores}]`.
- [X] T029 [US3] In `cartas-bilingues.js` implement and export `tiposDeTarjeta({nombres, direcciones, telefonos})` with today's thresholds (names ≥ 2 → `identity-names`; phones ≥ 2 → `identity-phones`; addresses ≥ 2 → `identity-addresses`; all three ≥ 2 → `identity-mixed`; returned in that order) and `ordenarDisputados(valores)` (stable sort: `Nombre` / `Nombre o alias` = 0, `Dirección` = 1, `Teléfono` = 2, other = 3; returns a new array).
- [X] T030 [US3] In `cartas-bilingues.js` `cartaIdentidad()` build the `disputados` block from `ordenarDisputados(valoresDisputados)` (one `- <tipo>: <valor>` line per value, phones already hyphenated by T010) in both languages.
- [X] T031 [US3] In `credito.html` (the block of `addNegative` calls for names, phones, addresses and mixed identity, around lines 1382–1385) compute `const tarjetas = window.ThemoraCartas && window.ThemoraCartas.tiposDeTarjeta ? window.ThemoraCartas.tiposDeTarjeta({nombres:reportedNames.size, direcciones:addresses.size, telefonos:phoneNumbers.size}) : <today's inline thresholds>` and keep each existing `addNegative` (same priority, title, description, action, evidence, solutionType, issueKey) but call it only when its subtype is in `tarjetas`, and pass `allDetectedIdentity` as `detectedValues` to ALL of them (was: only its own type's list, except mixed). Leave `addPositive('Información personal consistente', …)` and the score untouched (AC-3.4).
- [X] T032 [US3] In `credito.html` rewrite `detectedOptionsHtml(values, formId)`: when `window.ThemoraCartas.agruparDetectados` exists, render the outer `fieldset.cr-detected-data` (legend «Datos personales detectados» and the existing help text) containing one `fieldset.cr-detected-group[data-group]` per group with `legend` = `titulo + ' (' + valores.length + ')'`, a `button.cr-detected-toggle[type=button][aria-pressed=false]` labeled «Marcar todos» when the group has 2 or more values, and the same `label.cr-detected-option` + `input[name=disputedValue][type=checkbox][value=<escapeHtml(JSON.stringify(item))>]` as today (unique ids `formId+'Detected'+index`), nothing pre-checked, all text through `escapeHtml`; otherwise fall back to today's flat list (research R6). Markup per contracts/letters-module.md.
- [X] T033 [US3] In `credito.html` add the styles for `.cr-detected-group` (no extra border, small top margin), `.cr-detected-toggle` (small text button, min tap height 44px on phones) and `.cr-detected-option span{overflow-wrap:anywhere}` next to the existing `.cr-detected-*` rules (line ~170), and mirror the colors in the Apple-style override block (line ~483–487) so it matches the current look; no horizontal scroll at 360 px (AC-3.13).
- [X] T034 [US3] In `credito.html` extend the existing `results.addEventListener('click', …)` with a branch for `.cr-detected-toggle`: toggle every `input[name=disputedValue]` inside the button's own `fieldset.cr-detected-group` (all checked → uncheck all, else check all), then update its label («Marcar todos» ⇄ «Quitar todos») and `aria-pressed`; add a delegated `change` listener that keeps that button's state in sync when a single box is toggled. Other groups must not change (AC-3.7).
- [X] T035 [US3] Run `node --test tests/*.test.js` (all green), then do quickstart §4 steps 1–7 in a browser (3+2+3 sample, per-group toggle, letter order, no selection message, 2/1/1 and 1/1/1 cases, 360 px with 20+ values, network panel). **[Tests done, and the list markup was rendered with sample data in Node; real-browser walk-through of quickstart §4 (incl. 360 px and network panel) pending — needs the owner.]**

**Checkpoint**: All three stories work independently and together.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Docs, full verification and project rules.

- [X] T036 [P] Update `INSTRUCCIONES-CARTAS-BILINGUES.md` (Spanish, plain language): the new layout of «MI INFORMACIÓN CORRECTA» (7 lines, one address line), the phone rule (`XXX-XXX-XXXX`, 10 digits, leading `1` dropped, other lengths rejected at submit), the new functions and where they live (`cartas-bilingues.js`), how identity cards list all detected values grouped by type, and the two open questions with their defaults (one correct address/phone only; other two letters unchanged). Mention the test command `node --test tests/*.test.js`.
- [X] T037 Run the full suite `node --test tests/*.test.js`; report the exact counts. If any pre-existing test fails, report it as is — do not weaken it (constitution "Pruebas"). Confirm the only edited old assertions are the three edited in T006 (`HECHOS_REMITENTE`, the disputed-phone line, and the disputed-phone fact in `casos()`).
- [ ] T038 Run all of [quickstart.md](./quickstart.md) §2–§4 in a browser at 1280 px and 360 px and tick §5; also spot-check that the score, the other cards, the PDF print button and the address autocomplete on the letter forms still work (nothing else on the credit page changed). **[NOT DONE: needs a real browser.]**
- [X] T039 Check the diff: `git diff --stat -- credito.html` compared with the number recorded in T001 shows only hunks in the functions named above, and no whole-file line-ending change (LF only).
- [ ] T040 Run `graphify update .` (project rule). It currently fails on this machine (`did not find executable at …\Python314\python.exe`); if it still fails, report that plainly instead of skipping it. **[NOT DONE: `graphify update .` still fails with the missing Python path; see below.]**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 then T002 (T002 must run before any code edit).
- **Foundational (Phase 2)**: after T002. T003 and T004 touch different files (T004 is [P]).
- **User Stories**: all start after Phase 2.
  - **US1 (P1)** and **US2 (P1)** do not depend on each other. If done in the same sitting, do them one after the other because both edit `remitente()` (US1: the `phone` line; US2: the `address` lines) and `tests/cartas-bilingues.test.js`. US2 is the smallest change and gives a quick win; tasks are listed in spec order.
  - **US3 (P2)** depends on **T009** (US1's `formatearTelefono`) because detected phones are shown hyphenated.
- **Polish (Phase 6)**: after the stories you decided to ship.

### Within Each Story

- Tests first (T005–T008, T016–T019, T023–T027), confirmed red (T019's guard test is green by design).
- Pure functions in `cartas-bilingues.js` before the wiring in `credito.html`.
- Story checkpoint (T015, T022, T035) before the next story.

### Same-file ordering (why few tasks are [P])

| File | Tasks (in order) |
|---|---|
| `cartas-bilingues.js` | T003 → T009 → T010 → T020 → T021 → T028 → T029 → T030 |
| `credito.html` | T011 → T012 → T013 → T014 → T031 → T032 → T033 → T034 |
| `tests/cartas-bilingues.test.js` | T005 → T006 → T016 → T017 → T018 → T023 → T024 → T025 |
| `tests/credito-identidad.test.js` | T004 → T007 → T026 |

---

## Parallel Opportunities

- T004 (new test file) can be written while T003 is being done.
- Within a story, the static test file is separate from the letters test file: T007 alongside T005/T006; T026 alongside T023–T025 (different files, no shared state).
- T036 (docs) can run in parallel with T037–T038 once the code is final.
- Across stories, US2 can be built in parallel with US1 only if two people take separate branches and merge the two small edits in `remitente()`; with one person, go sequentially.

```bash
# Example for US1, two people or two terminals:
Task: "T005/T006 letters and formatter tests in tests/cartas-bilingues.test.js"
Task: "T007 static wiring tests in tests/credito-identidad.test.js"
```

---

## Implementation Strategy

### MVP First

The smallest shippable slice is **US2** (the bug that sends a padded letter to a bureau): T001–T004, then T016–T022. It changes one block in one file and needs no page changes.

1. Phase 1 + 2.
2. US2 → run tests → quickstart §3 → can ship.
3. US1 → quickstart §2 → can ship.
4. US3 → quickstart §4 → can ship.
5. Phase 6.

### Incremental Delivery

Each story ends with green tests and its own manual check, so any of them can be published alone. Nothing here needs new configuration, keys, functions or a database change, and `specs/` and `tests/` are already blocked from the public site.

### Rules to keep while implementing (constitution)

- Do not weaken a test to make it pass; report failures as they are (Principle IV).
- Nothing typed or detected is sent anywhere or added to analytics (Principle II).
- No AI, no new dependency, no new script tag, no new external origin (Principle III, technical constraints).
- The English column never contains Spanish and neither language says «es ilegal» / «debes» / promises a result (Principle I); no new English text is added, so nothing new joins the native-review list (Principle V).

---

## Notes

- Acceptance criteria are in [spec.md](./spec.md) (AC-1.x, AC-2.x, AC-3.x); the mapping of each one to a test (`T`) or manual step (`M`) is the traceability table in [plan.md](./plan.md).
- Commit after each story or logical group, one purpose per commit, explaining why (constitution "Cambios por partes pequeñas"). `credito.html` already has uncommitted changes from earlier work; stage only the hunks of this feature.
- Open questions Q1 and Q2 have defaults in the plan; answering them differently adds tasks (Q1: a repeatable "additional correct address/phone" field group and letter lines; Q2: the same one-line change in the other two `mi-informacion` blocks).
