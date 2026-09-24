# Implementation Plan: "¿Aparezco?" fills in my city from my location

**Branch**: `008-aparezco-city-from-location` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-aparezco-city-from-location/spec.md`

## Summary

Pre-fill the "Ciudad y estado" field on `aparezco.html` with the visitor's US city ("Ciudad, ST"), taken from the signed-in profile when available or else from Netlify's IP-based `context.geo` through a tiny new function. The value is editable, never overwrites typing, is not stored, and an empty city now blocks the search instead of searching "near the server". Rules live in one tested module.

## Technical Context

**Language/Version**: JavaScript (browser ES2019+; Node 18+ for Netlify Functions and tests)

**Primary Dependencies**: None new. Netlify Functions (modern syntax for `context.geo`), existing `auth.js` (`CCAuth`) for the profile.

**Storage**: N/A (nothing stored)

**Testing**: `node --test tests/*.test.js` (existing runner)

**Target Platform**: Static site on Netlify; mobile and desktop browsers

**Project Type**: Static web site + serverless functions

**Performance Goals**: City in the field within 2 s of load for ≥ 90 % of US visits (SC-001); no delay added to the form.

**Constraints**: No permission prompt; no third-party call; `Cache-Control: private, no-store`; CSP unchanged (`connect-src 'self'` already covers the function); `geolocation=()` stays.

**Scale/Scope**: 1 page, 1 new function, 1 new module, 2 new test files, small edits to `aparezco.html`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Honestidad | Note says the city was *detected* and can be changed; result shows the city used; nothing claimed about precision. | PASS |
| II. Privacidad por diseño | Only city + state leave the function; no lat/long/ZIP; no logs; not stored; analytics categorical only; privacy note updated. | PASS |
| III. Funciona sin IA / degrade | Any failure → page identical to today. No AI involved. | PASS |
| IV. Una sola verdad, probada | State list, formatting, profile parsing and classification in `ciudad-sugerida.js`, covered by tests; function has its own contract test. | PASS |
| V. Multilingüe | Page is Spanish-only today; new texts are Spanish. | PASS |
| Restricciones técnicas | No framework, no dependency; secrets untouched; CSP/Permissions-Policy unchanged; LF line endings. The function spends no money, so the "session + rate limit" rule for costly functions does not apply. | PASS |
| Documentación | No setup needed (geo is built into Netlify); no `INSTRUCCIONES-*.md` required. | PASS |

Post-design re-check: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/008-aparezco-city-from-location/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ubicacion-function.md
│   └── ui-campo-ciudad.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
aparezco.html                       # field note, clear button, empty-city check, "Buscamos en", analytics prop, privacy line
ciudad-sugerida.js                  # NEW — rules (browser global ThemoraCiudad + CommonJS export)
netlify/functions/ubicacion.mjs     # NEW — modern-syntax function returning { ciudad, estado }
tests/ciudad-sugerida.test.js       # NEW
tests/ubicacion-funcion.test.js     # NEW
```

**Structure Decision**: Follow the existing flat layout: page scripts at the root next to the page that uses them (like `auth-helpers.js`), functions in `netlify/functions/`, tests in `tests/`. The `.mjs` extension lets this one function use the modern syntax without changing the CommonJS style of the others.

## Complexity Tracking

None.
