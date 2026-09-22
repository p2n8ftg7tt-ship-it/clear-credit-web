# Implementation Plan: Address Autocomplete Everywhere + Side-by-Side Bilingual Letters

**Branch**: `003-address-autocomplete-bilingual-letters` (no git branch created) | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-address-autocomplete-bilingual-letters/spec.md`

## Summary

Two independent deliverables that share one release:

- **Part A — address suggestions in all six address forms (F1–F6).** Root causes found in the spec's diagnosis: (D1) the server-side service is not published (404 in production, checked today); (D2) only one page loads and wires the browser script; (D3) the script only understands "street + city + state + ZIP as four separate fields", while the account page merges state/ZIP and the business page has one single address field. Approach: keep the existing browser script and server function (FR-010) and make the script **declarative and shape-aware**: forms mark their address fields with `data-dir-*` attributes, the script wires any marked block lazily from one document-level listener, and fills "whatever fields exist" (separate, merged state/ZIP, or a single full-address field). Add a no-cost `estado` action to the service so the owner can tell "not published" from "not configured" in one command. Add a **static coverage test** that fails when a form has an address-looking field that is neither wired nor explicitly allowlisted — this removes the reason the gap appeared (D2). Before publishing, add the missing 404 blocks in `netlify.toml` so the publish that fixes D1 does not expose `specs/`, `.specify/`, internal notes, etc.
- **Part B — two-column Spanish/English letter drafts on the credit analyzer.** Approach: one new dependency-free module `cartas-bilingues.js` (browser + Node, like `zyron-leyes.js`) that builds each letter from **one list of paired blocks** (`{es, en}`), so the two columns cannot drift (Constitution IV). `credito.html` renders the blocks as a row-aligned two-column grid (stacked on phones), and the primary button copies only the English text. Analyzer findings get a stable key so the English letter never quotes a Spanish finding title. Text typed by the person is copied verbatim to both columns and triggers a "review in English" note. No AI, no translation service, nothing sent anywhere (Constitution II, III). Tests compare facts between columns and enforce the honesty rules.

## Technical Context

**Language/Version**: Plain browser JavaScript (ES5-style, matching `direccion-autocompletar.js`; ES2017+ allowed where a file already uses it, e.g. `credito.html` inline script) and Node 18+ for Netlify Functions and tests. No transpilation.

**Primary Dependencies**: None new. Existing: Netlify Functions runtime, Google Places API (New) via the existing function, `node:test` for tests, browser `Intl.DateTimeFormat`. No translation/AI service.

**Storage**: N/A. No new persistence; letter content stays in the page. The account profile keeps saving through its existing Supabase metadata path (unchanged).

**Testing**: `node --test tests/` (existing suites must keep passing). New: `tests/direccion-formas.test.js` (pure composing logic), `tests/formularios-direccion.test.js` (static coverage of address fields across HTML files), `tests/cartas-bilingues.test.js` (paired blocks, facts, honesty), and additions to `tests/autocompletar-direccion.test.js` (`estado` action, unchanged behavior). Manual browser verification per [quickstart.md](./quickstart.md).

**Target Platform**: Static site on Netlify (`publish = "."`), modern desktop and mobile browsers (360 px and 1280 px are the tested widths).

**Project Type**: Static multi-page website + serverless functions (no build step).

**Performance Goals**: Suggestions visible ≤ 2 s after the person stops typing (unchanged: 350 ms debounce, 4-char minimum). Letter generation is synchronous and local (< 50 ms).

**Constraints**: No framework, no new external origin (CSP `connect-src 'self'` already suffices); no secrets in the repo; nothing sent before the person types in an address field; address fields never break manual entry; works offline for letters; LF line endings; every file at the repo root is public unless blocked.

**Scale/Scope**: 6 address forms across 4 pages (`credito.html`, `herramientas.html`, `cuenta.html`, `listar-negocio.html`), 3 letter types, 1 browser script changed, 1 function changed, 1 new module, 3 new test files, 1 new instructions file, `privacidad.html` and `netlify.toml` updated.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see bottom.*

| Principle / rule | Assessment | Status |
|---|---|---|
| **I. Honestidad y no asesoría** | English text is the equivalent of the existing Spanish letters (which already cite FCRA § 1681i and FDCPA § 1692g and only state the person's request). Tests forbid "illegal / ilegal", "you must / debes", guarantees, in both languages. The educational disclaimer stays and adds that the English draft is the person's responsibility to review. | PASS |
| **II. Privacidad por diseño** | Only the text typed in a street field goes to our function (never name, phone, other fields); nothing before typing. Now also collector and business street text → `privacidad.html` and the third-party table MUST be updated in the same change (gate G-PRIV). Letter content never leaves the browser; analytics only get an event name (no content). The new `estado` action carries no user text. | PASS (with G-PRIV) |
| **III. Funciona sin IA** | Nothing here uses AI. Address service down → manual entry with a note; letters are built locally. | PASS |
| **IV. Una sola verdad, probada** | Each letter is one list of paired blocks; facts are inserted once and rendered in both languages. Tests assert the same facts and citations appear in both columns; composing of address values is a tested pure function; a coverage test guards every address field. `node --test tests/` MUST pass before publish. | PASS |
| **V. Multilingüe con revisión humana** | English text is written by Claude → MUST be marked pending native review (`TODO(NATIVE_REVIEW)` in the module header and a checklist item in `INSTRUCCIONES-CARTAS-BILINGUES.md`); the page keeps the "review before sending" note. Not presented as professionally reviewed. | PASS (review pending, tracked) |
| **Static site, no build; functions for server logic** | Uses plain files and the existing function; no framework or dependency. | PASS |
| **Everything at the root is published → block internal files** | **Currently violated** by the repo state: `specs/`, `.specify/`, `.claude/`, `graphify-out/`, `CLAUDE.md`, `skills-lock.json` and `INSTRUCCIONES-PAGOS.md` are not blocked in `netlify.toml`, and the publish that fixes D1 would ship them. Plan adds 404 rules for these and for every new internal file (gate G-BLOCK). | PASS after G-BLOCK |
| **Secrets outside the code** | Key stays in Netlify env (`GOOGLE_PLACES_API_KEY`). `estado` only reports true/false. | PASS |
| **Session check + rate limit on functions that spend money** | The existing function has origin check, per-IP and per-address-session limits but **no Supabase session check**. Pre-existing; widened use makes it matter more. See Complexity Tracking. | JUSTIFIED DEVIATION |
| **Browser security headers / CSP** | No new external service or origin; CSP unchanged. | PASS |
| **File format LF** | New/edited files keep LF; check `git diff --stat` for whole-file diffs. | PASS (verify) |
| **Docs beside the change** | New `INSTRUCCIONES-DIRECCIONES.md` (publish + key + verification) and `INSTRUCCIONES-CARTAS-BILINGUES.md` (how letters are built, review checklist). Site text must not advertise address help on new forms until the service is live (rule "no mencionar la función hasta que los pasos estén hechos") → notices are shown only when the service answers (see research R7). | PASS |
| **Graph** | Run `graphify update .` after code changes. | TODO at implementation |

**Gate result**: PASS to proceed to Phase 0, with three gates that MUST be closed before publishing: G-BLOCK (block internal files), G-PRIV (privacy text), G-TESTS (`node --test tests/` green).

## Project Structure

### Documentation (this feature)

```text
specs/003-address-autocomplete-bilingual-letters/
├── plan.md              # This file
├── research.md          # Phase 0: decisions, rationale, alternatives
├── data-model.md        # Phase 1: address block shapes, letter/blocks model
├── quickstart.md        # Phase 1: how to prove it works, end to end
├── contracts/
│   ├── address-service.md        # function contract incl. new `estado` action
│   ├── address-form-markup.md    # data-dir-* attributes + browser API
│   └── bilingual-letter.md       # cartas-bilingues.js API, DOM, copy rules
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

The repo is a flat static site (no `src/`); paths below are real.

```text
direccion-autocompletar.js        # CHANGED: declarative wiring, shapes (separate / merged state+ZIP / single), several blocks per form, stops on 404/403/405, `__prueba` export
cartas-bilingues.js               # NEW: paired es/en letter blocks for identity / bureau-dispute / debt-validation; browser + Node
credito.html                      # CHANGED: data-dir-* on person + collector fields; remove per-page focusin glue; load new module; two-column result markup + CSS; findings get stable keys; fix stale "solo si lo activas" note
herramientas.html                 # CHANGED: load script; data-dir-* on person + collector address
cuenta.html                       # CHANGED: load script; data-dir-* on profile address/city/state+ZIP
listar-negocio.html               # CHANGED: load script; data-dir-* on single business address field
privacidad.html                   # CHANGED: describe all forms (incl. collector + business); update third-party table row
netlify.toml                      # CHANGED: 404 rules for internal files (G-BLOCK); CSP unchanged
netlify/functions/autocompletar-direccion.js   # CHANGED: `estado` action (no Google call); comment header updated (no "casilla")
INSTRUCCIONES-DIRECCIONES.md      # NEW: publish, env key, Google Console steps, one-command check, quota
INSTRUCCIONES-CARTAS-BILINGUES.md # NEW: how the letters are built, native-review checklist
site-search-index.js              # UNCHANGED (no new pages)

tests/
├── autocompletar-direccion.test.js   # CHANGED: `estado` action
├── direccion-formas.test.js          # NEW: composing values per shape
├── formularios-direccion.test.js     # NEW: every address-looking field is wired or allowlisted
├── cartas-bilingues.test.js          # NEW: paired blocks, same facts, honesty, free-text note trigger
└── zyron-leyes.test.js               # UNCHANGED
```

**Structure Decision**: Keep the flat static layout. Browser logic that must also run under Node tests follows the existing pattern (`if (typeof module !== 'undefined' && module.exports)` in `zyron-leyes.js`) instead of introducing a build step or bundler. Address wiring is centralized in the one existing script; letters in one new module so the three letter types share strings and cannot diverge.

## Delivery order (input for `/speckit-tasks`)

1. **G-BLOCK + service check** — `netlify.toml` blocks; `estado` action + tests; `INSTRUCCIONES-DIRECCIONES.md`. (Unblocks the owner to publish and verify D1 independently of everything else.)
2. **Address script generalization** — shapes, declarative wiring, failure handling, pure functions + `direccion-formas.test.js`.
3. **Wire the forms** — credito (person + collector), herramientas (both), cuenta, listar-negocio; stale text fixes; `privacidad.html` (G-PRIV); `formularios-direccion.test.js`.
4. **Bilingual module** — `cartas-bilingues.js` + `cartas-bilingues.test.js` (no UI yet).
5. **Analyzer UI** — stable finding keys, two-column result, English-only copy, free-text note, CSS (light "galería blanca" tokens already in `credito.html`), phone stacking, print shows English only.
6. **Docs + graph + final gates** — `INSTRUCCIONES-CARTAS-BILINGUES.md`, `node --test tests/`, `graphify update .`, manual pass from `quickstart.md`, owner publishes (`netlify deploy --prod`) and runs the one-command check.

Steps 1 and 4 have no dependency on each other; Part A (1–3) and Part B (4–5) can be delivered separately, but the spec is one release.

## Complexity Tracking

| Deviation | Why Needed | Simpler / Stricter Alternative Rejected Because |
|---|---|---|
| Address function has no Supabase session check (pre-existing, kept) | The credit analyzer and tools page are usable without an account (that is the site's promise); requiring login would block the very people the letters are for. Existing mitigations: same-site origin check, 60 queries / 10 min per IP, 30 per typed address, sensitive-number rejection, no logging of typed text. | Requiring a session on all forms — rejected for F1–F4 (anonymous use). **Follow-up recorded, not in scope:** require a session for F5/F6 if usage grows, and set the daily Places quota in Google Cloud (documented as a mandatory owner step in `INSTRUCCIONES-DIRECCIONES.md`), because in-memory limits are per function instance and not a firm cap. |
| Two new instruction files and two new `netlify.toml` block groups | Constitution: config-needing features ship with `INSTRUCCIONES-*.md`; internal files must not be public. | Skipping docs/blocks — rejected: the publish that fixes D1 would also publish `specs/`, `.specify/`, `graphify-out/`, `CLAUDE.md`. |

## Post-Design Constitution Re-check

After Phase 1 (research, data model, contracts, quickstart):

- **I** — Contracts require the same legal citations and forbid advice wording in both languages; tested. **PASS**
- **II** — Contracts fix what leaves the browser: the `sugerir`/`detalle`/`estado` requests only; letter data has no network path. Gate G-PRIV stays open until `privacidad.html` is updated. **PASS (gate open until edit)**
- **III** — No AI dependency introduced anywhere in the design. **PASS**
- **IV** — Single block list per letter; coverage test for address wiring; pure composing function tested. **PASS**
- **V** — Native-review marker and checklist are part of the deliverables. **PASS (review pending, tracked)**
- **Restrictions** — No new dependency, origin, or build step; secrets unchanged; blocks added. **PASS**
- **New risk recorded**: English legal wording accuracy depends on human review (FR-030); until reviewed the UI keeps the "review before sending" note and no claim of professional review.
