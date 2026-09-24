# Implementation Plan: Themora Digital Score (TDS) on "¿Aparezco?"

**Branch**: `007-themora-digital-score` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-themora-digital-score/spec.md`

## Summary

Replace the "percent of checks met" score on ¿Aparezco? with the Themora Digital Score: five weighted pillars from the owner's methodology (`.py`), a Bayesian-adjusted rating, visibility rule B, honest handling of data the source cannot provide (excluded, never zero), bands with observed-only wording, the top 3 actions with point gains, and a what-if simulator. All scoring lives in one module (`tds.js`) used by the Netlify function and the page, with tests built around the Guajiro Llc reference case.

## Technical Context

**Language/Version**: JavaScript (browser ES2019+; Node 18+ for the function and tests)

**Primary Dependencies**: None new. Existing Google Places data in `netlify/functions/revisar-negocio.js`.

**Storage**: N/A (computed per search, FR-018)

**Testing**: `node --test tests/*.test.js`

**Target Platform**: Static site on Netlify; mobile and desktop browsers

**Project Type**: Static web site + serverless functions

**Performance Goals**: No perceptible added time to the result (scoring is arithmetic on data already fetched); simulator recompute < 0.5 s (SC-004).

**Constraints**: No new Google fields or calls (cost unchanged); no stored data; analytics categorical only; Spanish; works at 320 px.

**Scale/Scope**: 1 new module, 1 function edit, 1 page edit, 2 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Honestidad | Band texts describe only observed searches; today's "pierdes clientes" texts are removed; forbidden-wording test; methodology marked "not yet validated"; paying Themora never adds points. | PASS |
| II. Privacidad | Nothing stored; `entradaTDS` has no identifying data; analytics switch from numeric `puntaje` to categorical `banda`/`parcial` (fixes an existing violation). | PASS |
| III. Funciona sin IA | TDS is pure arithmetic; AI suggestions remain optional and unchanged. | PASS |
| IV. Una sola verdad, probada | `tds.js` is the only scorer (server + browser); reference-case and boundary tests. | PASS |
| V. Multilingüe | Page is Spanish-only; no new languages. | PASS |
| Restricciones técnicas | No framework or dependency; no new external service; CSP unchanged (`tds.js` is same-origin); LF endings. | PASS |
| Documentación | No new configuration; methodology explained on the page itself (FR-019). | PASS |

Post-design re-check: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/007-themora-digital-score/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── revisar-negocio-respuesta.md
│   └── ui-tds.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
tds.js                               # NEW — scoring rules, bands, reasons, actions (ThemoraTDS + CommonJS)
netlify/functions/revisar-negocio.js # build EntradaTDS from Google data; return tds + entradaTDS; drop puntaje
aparezco.html                        # score block, pillars, actions, simulator, methodology, analytics, band tokens
tests/tds.test.js                    # NEW
tests/revisar-negocio-tds.test.js    # NEW (Google mocked)
```

**Structure Decision**: Same flat layout as the rest of the site: shared browser/Node logic at the root (like `auth-helpers.js`, `tasas-texto.js`), required by the function with a relative path, tests under `tests/`.

## Dependencies between features

- **008 (city from location)** also edits `aparezco.html` (search form). The two touch different parts of the page (form vs. result) and can be built in either order; 008 improves the category position and competitor average that 007's Visibilidad and reference rating depend on.

## Complexity Tracking

None.
