# Implementation Plan: Floating Rate Houses (Buy-a-House page)

**Branch**: `006-floating-rate-houses` (no git branch created) | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-floating-rate-houses/spec.md` (with the clarification of 2026-09-21: option C)

## Summary

Two floating house icons on **Comprar casa** — 30 años and 15 años — each showing its interest rate on the icon, acting as the "active agents": a visible status, the true "as of" date, the change since the previous reading, an alert mark when the rate agent has an alert, and a details panel with the sources, the Federal Reserve context and links to the big lenders' own rate pages.

Approach (evidence in [research.md](./research.md)):

- **No new data source, no new pipeline, no new endpoint.** The houses are a second view of the snapshot the fixed `#tasas` block already reads (feature 004). One `fetch`, one `datos` object, two renderings — so rate, change, date and source can never disagree (FR-016).
- **Same file, same launch gate.** The houses are drawn by `tasas-hipoteca.js` (already loaded on the page, `defer`) behind the existing `TASAS_LANZADO` constant, so there is one switch, not two (FR-017). All wording, the state logic and the lender list live in `tasas-texto.js`, where the wording tests already run.
- **One small additive change to the public snapshot**: a new field `ultimaRevisionEn` (time of the last run in which the agent read its sources). It lets the house say "activo" only when the agent has really looked recently, instead of promising daily watching it cannot prove (FR-006, FR-009). Version stays `1`; a missing field degrades to "no claim".
- **Pure CSS houses** (a clipped pentagon), a `position: fixed` group at the bottom-left, opposite the assistant launcher; a shared details panel; dismiss for the visit via `sessionStorage`; a 15-minute refresh while the tab is visible so a long-open page picks up a newer reading.
- **Lender links only, never lender figures** (FR-022): a short, owner-approved list in `tasas-texto.js`, validated by a test (https, no query string, no tracking).

**Important findings for the owner** (details in research): (1) a fixed overlay cannot promise to cover *nothing* on a phone, so FR-003 / SC-002 were reworded to what can be guaranteed (see spec Assumptions, "Overlap"); (2) the lender list and each link must be approved and opened by hand before launch (gate **G-LENDERS**); (3) the label says "Actualizado / publicado el {fecha}", never "en vivo".

## Technical Context

**Language/Version**: Plain browser JavaScript (ES2017 max, like the existing scripts); Node 18+ CommonJS for the one Netlify function tweak and the tests. No transpilation.

**Primary Dependencies**: None new. Node's built-in `node:test`, `node:vm`; the existing fake-DOM harness in `tests/tasas-navegador.test.js`.

**Storage**: No new tables. Browser: one `sessionStorage` key (`themora_casas_cerradas`) for "dismissed for this visit"; every access in `try/catch`. Server: the public function reads one more row (latest successful run time) from the existing `tasas_corridas` table — see [data-model.md](./data-model.md).

**Testing**: `node --test tests/` — extend `tests/tasas-texto.test.js`, `tests/tasas-navegador.test.js`, `tests/tasas-paginas.test.js`, `tests/tasas-hipoteca-logica.test.js`, `tests/tasas-hipoteca-funcion.test.js`. Visual/keyboard check with a throwaway preview server, see [quickstart.md](./quickstart.md).

**Target Platform**: Static site on Netlify (`publish = "."`) + the existing `tasas-hipoteca` function. Modern desktop and mobile browsers (checked at 360 px, 768 px, 1280 px, plus phone landscape).

**Project Type**: Static multi-page website + serverless functions (no build step).

**Performance Goals**: No extra request on load (reuses the block's single snapshot fetch); the houses render in the same tick as the block. Re-poll every 15 minutes only while the tab is visible; the CDN already caches the snapshot for 5 minutes, so polling costs the database nothing.

**Constraints**: CSP unchanged (same-origin function only; lender links are plain `<a>` and need no `connect-src`); no image/font/icon library (CSS shape); `prefers-reduced-motion` honored; everything degrades to "no houses" (never an error); LF line endings; no rate number typed in the HTML.

**Scale/Scope**: 1 JS file extended (`tasas-hipoteca.js`), 1 text module extended (`tasas-texto.js`), 1 function + 1 pure-logic tweak (additive field), `comprar-casa.html` CSS only (no new markup — the group is created by script), 5 test files extended, `INSTRUCCIONES-TASAS.md` one new section, `privacidad.html` one existing launch line widened, 1 throwaway preview script under `tests/`.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 design — see bottom.*

| Principle / rule | Assessment | Status |
|---|---|---|
| **I. Honestidad y no asesoría (NON-NEGOTIABLE)** | Every number is the snapshot's (Freddie Mac, unaltered) with its true publication date; the label never says "en vivo" (FR-009). "Activo" is shown only when the figure is fresh **and** the agent's last successful check is recent (`estadoCasa`); otherwise "Sin actualizar". Panel and alert mark use the same generator as the block, so the forbidden-word test (SC-006) covers them; Treasury and Fed alerts keep their "weekly average not yet republished" and "the Fed does not set mortgage rates" notes (FR-029/032 of 004). Lender links never show a lender figure, never rank or endorse (FR-022). | PASS |
| **II. Privacidad por diseño** | No personal data collected or sent; no new third party contacted from the browser (lender links are user-initiated navigations with `rel="noopener noreferrer"` and no referral parameters). Dismissal lives in the visitor's own `sessionStorage`. Analytics categorical only (term `30`/`15` as a category; no rates, dates, alert ids, lender names). **At launch**, the existing privacy line is widened to mention the session memory (task in the launch commit, gate **G-PRIV**). | PASS (privacy line = launch task) |
| **III. Funciona sin IA** | No AI. Every failure path (snapshot down, storage blocked, no JS, no data) means "no houses" or the block's honest message; the page is never blocked. | PASS |
| **IV. Una sola verdad, probada** | One snapshot, two views; text, state logic and lender list each live in one place (`tasas-texto.js`); a test asserts the house numbers equal the block's for the same `datos`. New logic ships with `node --test` coverage before publishing (**G-TESTS**). No rate number is typed in HTML/JS (test extended). | PASS |
| **V. Multilingüe con revisión humana** | Spanish only in v1, strings in the existing `TEXTOS` object; any later AI translation gets `TODO(NATIVE_REVIEW)`. | PASS |
| **Static site, no build; functions for server logic** | Plain files; no framework or package. | PASS |
| **Everything at the root is published → block internal files** | No new root file. The preview script lives under the already-blocked `tests/`. | PASS |
| **Secrets outside the code** | No new secret or env var. | PASS |
| **Session check + rate limit on functions** | The only server change is inside `tasas-hipoteca` (public, read-only by design, justified in 004's Complexity Tracking). It adds one indexed read of one timestamp; response stays CDN-cached. | PASS (inherits 004 justification) |
| **Browser security headers / CSP** | Unchanged; test asserts it. | PASS |
| **Docs beside the change** | `INSTRUCCIONES-TASAS.md` gets a Spanish section: how the houses reuse the launch switch, how to approve the lender list, how to preview, how to hide the houses. The site says nothing until launch. | PASS |
| **File format LF** | Verify with `git diff --stat` after edits. | PASS (verify) |
| **Graph** | Run `graphify update .` after code changes. | TODO at implementation |

**Gate result**: PASS to proceed, with these gates to close before publishing: **G-LENDERS** (owner approves the lender list; each link opened by hand and confirmed to land on that lender's own public rates page), **G-PRIV** (privacy line widened only in the launch commit), **G-TESTS** (`node --test tests/` green), **G-LAUNCH** (the 004 launch steps — the houses ship inside them and add no separate launch), **G-PLACE** (owner confirms placement and wording on a real phone).

## Project Structure

### Documentation (this feature)

```text
specs/006-floating-rate-houses/
├── plan.md                          # This file
├── research.md                      # Phase 0 (decisions R1–R12)
├── data-model.md                    # Phase 1 (view model, states, one additive field)
├── quickstart.md                    # Phase 1 (validation guide)
├── contracts/
│   ├── snapshot-additive.md         # `ultimaRevisionEn` added to GET tasas-hipoteca
│   └── ui-houses.md                 # houses, panel, states, wording, a11y, analytics
├── checklists/requirements.md       # from /speckit-specify
└── tasks.md                         # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
tasas-texto.js                      # EDIT  + TEXTOS.casa*, estadoCasa(), marcaDeAlerta(), textoCasa(),
                                    #        textoPanelCasa(), PRESTAMISTAS (owner-approved list), validators
tasas-hipoteca.js                   # EDIT  + pintarCasas(), panel, dismiss, focus/overlay auto-hide, 15-min refresh
                                    #        (all behind the existing TASAS_LANZADO constant)
comprar-casa.html                   # EDIT  CSS only: .casas-flotantes* (inside the existing tasas <style> block)
netlify/functions/tasas-hipoteca.js         # EDIT  + read latest successful run time (one more query)
netlify/functions/tasas-hipoteca-logica.js  # EDIT  construirRespuestaPublica(): + ultimaRevisionEn
INSTRUCCIONES-TASAS.md              # EDIT  + section "Las casas flotantes" (Spanish)
privacidad.html                     # EDIT  at launch only: widen the existing line to include sessionStorage
site-search-index.js                # (no change: houses are part of the existing #tasas entry)

tests/
├── tasas-texto.test.js             # EDIT  states, wording, lender list rules
├── tasas-navegador.test.js         # EDIT  houses render / agree with block / stale / dismiss / keyboard / refresh
├── tasas-paginas.test.js           # EDIT  CSS (reduced motion, no typed rate), analytics allowlist, CSP, gate
├── tasas-hipoteca-logica.test.js   # EDIT  ultimaRevisionEn
├── tasas-hipoteca-funcion.test.js  # EDIT  extra read + failure keeps working
├── fixtures/tasas/snapshot-casas.json   # NEW  sample snapshots (fresh, stale, alert, no data)
└── preview-casas.js                # NEW  throwaway local server for the visual check (blocked by 404 rule with tests/)
```

**Structure Decision**: extend the existing static-site-plus-functions layout exactly as 004 did. No new root file, no new dependency, no new endpoint. The houses are drawn by script (no HTML is added to `comprar-casa.html` beyond CSS), so before launch — when `TASAS_LANZADO` is `false` — the page contains no houses markup at all and makes no request.

## Complexity Tracking

| Deviation / risk | Why needed | Simpler alternative rejected because |
|---|---|---|
| **Additive field `ultimaRevisionEn` on the public snapshot** | "Agente activo" must be provable. Today the snapshot only proves the Mon/Tue publish; a daily-check failure mid-week would leave the houses claiming activity | Hard-coding "vigilando a diario" would be a promise the page cannot back (Principle I). Adding a whole new endpoint or table is heavier than one extra timestamp read |
| **Fixed overlay cannot promise "covers nothing"** (spec FR-003/SC-002 reworded) | Any `position: fixed` element covers something at some scroll position on a small screen | Inline (non-floating) houses would not float, which is the request. Mitigation instead: small footprint in the corner opposite the assistant, auto-hide while a form field is focused or a full-screen tool is open, dismiss button, bottom padding so the footer is never trapped |
| **Polling every 15 minutes while visible** | FR-007: a long-open page should pick up a newer reading without a reload | WebSockets/SSE would need new infrastructure for data that changes at most a few times a week; the CDN cache makes polling free |
| **Lender list is hand-maintained** | FR-022 needs owner-approved lender links; no source can tell us which lenders are "big" or which URL is their rates page | Scraping/lookup services would risk terms-of-use problems and is out of scope; the test enforces the rules (https, no query, no figures) so the manual list cannot go wrong silently |
