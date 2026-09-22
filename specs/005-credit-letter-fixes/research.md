# Research: Credit Page Fixes — Phone Hyphens, No Repeated Address, Many Reported Identities

**Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Everything below was checked against the project files on 2026-09-21. No `NEEDS CLARIFICATION` remains open in the plan; two owner questions (Q1, Q2 in the spec) have a default and do not block work.

## R1 — Where does the phone formatter live, and how is it applied?

- **Decision**: Two small pure functions in `cartas-bilingues.js`, exported on `ThemoraCartas` and tested under Node:
  - `telefonoEscribiendo(valor)` — used while typing/pasting/autofilling. Removes non-digits, drops one leading `1` **only when 11 digits are present**, caps at 10 digits, and inserts hyphens progressively (`5`, `54`, `540`, `540-5`, … `540-555-0142`).
  - `formatearTelefono(valor)` — used for output (detected list, letters). Returns `XXX-XXX-XXXX` when the value has exactly 10 digits (after the same leading-`1` rule); otherwise returns the trimmed original text unchanged, so odd data is never silently mangled.
  - `credito.html` calls them for the input handler and for the detected list; `remitente()` and the disputed-values block call `formatearTelefono` so the letter is right even if the typing helper never ran (AC-1.9).
- **Rationale**: One source for the format (Constitution IV). The letters module already ships on the credit page, has a Node test suite, and is where the phone is printed. A separate file for two functions would add a script tag and a dependency between two modules for no gain.
- **Alternatives considered**:
  - *A new `telefono.js` shared by all pages*: right home if other pages adopt it (A4), but no other page is in scope; can be extracted later because the functions are pure.
  - *A JS masking library*: a dependency for 10 lines of code; the project bans new dependencies without evidence (Constitution "Restricciones técnicas").
  - *Only a `pattern` attribute*: validates but does not format; does not fix the detected list or the letter.

## R2 — Typing behavior, caret and validation

- **Decision**: One delegated `input` listener on the results container (the forms are created dynamically by `renderStrategy`), acting on inputs with `name="currentPhone"`. It counts the digits before the caret, rewrites the value, and puts the caret after the same number of digits, so editing in the middle does not jump to the end (AC-1.1). Browser autofill fires `input`/`change`, so AC-1.8 is covered by the same handler. Field attributes: `inputmode="tel"`, `maxlength="20"`, `placeholder="540-555-0142"`, `pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"`, `title="Escribe un teléfono de 10 dígitos, como 540-555-0142."`. Submit relies on the native `required` + `pattern` (same technique the ZIP field already uses) with a JS backstop in `readPersonalInfo` callers.
- **Rationale**: Delegation avoids re-binding every time a card is rendered. `pattern`/`title` already work for ZIP, so the person sees a familiar message and focus lands on the field without extra code (AC-1.5). `maxlength` is lowered from 30 to 20, not to 12: the browser cuts a pasted `+1 (540) 555-0142` to the maxlength BEFORE our handler runs, which would lose digits (AC-1.2). The 10-digit cap (AC-1.4) is enforced by the formatter, and without JS the `pattern` still rejects anything that is not exactly `XXX-XXX-XXXX` at submit.
- **Alternatives considered**: *`beforeinput` blocking of non-digits* — inconsistent across mobile keyboards; reformatting after `input` is more robust. *`type="text"`* — loses the phone keypad on mobile; keep `type="tel"`.

## R3 — Why the address is repeated (B2) and the minimal fix

- **Finding**: `cartaIdentidad()` builds block `correcta` with `Dirección actual: <street, city, state ZIP>` followed by `Calle y número`, `Ciudad`, `Estado`, `Código postal` (and the same in English). The sender block above already prints the same address and phone, and it is the only letter with the split lines.
- **Decision**: Delete the four split lines from both languages; keep `Dirección actual` (one line) plus the name lines and the phone. Build the address string once in `remitente()` from cleaned parts: `[calle, ciudad, (estado + ' ' + cp).trim()]` filtered for empties and joined with `, `, whitespace collapsed inside each part (AC-2.5). Parts are cleaned with a new `limpio()` (collapse spaces) rather than by changing `texto()`, because `texto()` also feeds the free-text «Detalle adicional» which an existing test requires to stay verbatim.
- **Rationale**: Smallest change that matches the report; the Spanish and English blocks lose the same four lines so the column-parity tests keep holding.
- **Alternatives considered**: *Remove the whole `correcta` block because the sender block has the same data* — it would also drop the given/surname split (A6) and would change the letter's structure (contract). *Keep the split lines and drop the joined one* — the joined line is the one a bureau clerk reads; the split is the redundant one.

## R4 — Why parts of "many names, addresses and phones" are unreachable (B3) and the fix

- **Finding**: In `credito.html` the analyzer creates up to four identity cards: `identity-names` (≥ 2 names), `identity-phones` (≥ 2 phones), `identity-addresses` (≥ 2 addresses), `identity-mixed` (≥ 2 of each). Each card is given only its own type's values, except `identity-mixed`. So with 3 names, 1 address and 2 phones, the person can never tick the address; with 2 names and 1 address, the address is never offered.
- **Decision**:
  1. Add `tiposDeTarjeta({nombres, direcciones, telefonos})` (pure, exported, tested) that returns the card subtypes with today's thresholds — so what triggers a card does not change (AC-3.4).
  2. Give **every** identity card the full grouped list (AC-3.3). The card keeps its own letter subject (`ASUNTO_IDENTIDAD`), so the letter still says "several names" / "several phones" / etc.
  3. Add `agruparDetectados(valores)` (pure, exported, tested): de-duplicates (case- and space-insensitive; phones by digits), groups into `Nombres`, `Direcciones`, `Teléfonos` in a fixed order with counts, and drops empty groups. `detectedOptionsHtml` renders one `fieldset` per group with a «Marcar todos / Quitar todos» button (AC-3.2, 3.7, 3.12).
  4. Add `ordenarDisputados(valores)` (pure, used inside `cartaIdentidad`) so the letter lists ticked values names → addresses → phones, stable within a group (AC-3.9). The letter enforces this itself, independent of the page.
- **Rationale**: Fixes the unreachable case without changing the score, priorities or card titles. Doing the grouping and the ordering in pure functions makes AC-3.1–3.9 testable in Node, which the inline script in `credito.html` is not.
- **Alternatives considered**:
  - *One merged "identity" card replacing the four*: simpler UI, but it changes card titles and priorities the person already sees, drops the type-specific letter subject and touches the score logic. Not needed to fix the bug.
  - *Per-card filtering by type (today)*: is the bug.
  - *A nested scrolling list for long lists*: nested scroll areas are awkward on phones; groups plus a per-group toggle keep 20+ values usable on the normal page scroll (AC-3.13).

## R5 — How is the analyzer's inline logic tested?

- **Finding**: The analyzer lives in an inline `<script>` in `credito.html`; the existing tests never execute it, they only read the file as text (`tests/formularios-direccion.test.js`) or test `cartas-bilingues.js` directly.
- **Decision**: Everything with a rule (formatting, de-duplication, grouping, card thresholds, ordering, the address line) moves into pure, exported functions of `cartas-bilingues.js` and is tested there. `credito.html` keeps only wiring (event handlers and HTML strings). A small static test asserts the wiring exists: the phone field has the new attributes, `detectedOptionsHtml` uses `agruparDetectados`, and no `identity-*` card is created with a type-only list.
- **Rationale**: Same approach the project already uses for address composing (`direccion-formas`). No headless browser dependency is added.
- **Alternatives considered**: *Adding jsdom/Playwright* — a new dependency with no existing precedent in the repo; manual browser checks in the quickstart cover the wiring.

## R6 — Fallback if the letters module does not load

- **Decision**: `credito.html` already shows «No pudimos preparar la carta» when `ThemoraCartas` is missing. For the new detected list, if `ThemoraCartas.agruparDetectados` is missing, the page falls back to today's flat list so the person is never left without the checkboxes (Constitution III, spirit).
- **Alternatives considered**: *Fail with an error* — makes a cosmetic module problem block the whole identity feature.

## R7 — Test command

- **Finding**: The constitution says to run `node --test tests/`. On the installed Node (v24.21.0), that form fails at baseline (`tests:1:1 … test failed`, 1 failure, 0 tests run) because the directory is treated as a file. `node --test tests/*.test.js` runs all 245 tests and passes at baseline (2026-09-21). There is no `package.json`.
- **Decision**: The plan, tasks and quickstart use `node --test tests/*.test.js`. This is reported to the owner as a small pre-existing discrepancy with the constitution's wording; fixing the wording is a PATCH amendment and is **not** part of this feature.
- **Alternatives considered**: *Adding a `package.json` with a test script* — introduces a file that would be published from the repo root; out of scope.

## R8 — Privacy and analytics

- **Decision**: No new network call, storage or analytics property. The `carta-generada` event keeps sending only `{tipo}`. Detected values are already in the page's memory and are never sent anywhere (Constitution II; AC-3.14).

## R9 — Honesty and language

- **Decision**: No new legal wording is added. The only new visible strings are UI labels in Spanish (group headings, «Marcar todos», phone message) and the removed English/Spanish lines. English label pairs (`Name`, `Address`, `Phone`) already exist in `ETIQUETAS_TIPO_DATO`. The English text of the letter stays pending native review, as recorded in spec 003 (Constitution V).
