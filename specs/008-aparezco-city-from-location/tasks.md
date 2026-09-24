# Tasks: "¿Aparezco?" fills in my city from my location

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: included (constitution IV).

## Phase 1: Foundational — rules module

- [X] T001 [P] Write `tests/ciudad-sugerida.test.js`: `formatear`, `codigoEstado` (code, code + ZIP, English and Spanish names, accents), `desdePerfil`, `clasificar`
- [X] T002 Create `ciudad-sugerida.js` (UMD: `window.ThemoraCiudad` + CommonJS) with the 50 states + DC; make T001 pass

## Phase 2: User Story 1 — detected city (P1)

- [X] T003 [P] Write `tests/ubicacion-funcion.test.js`: US geo → `{ciudad, estado}`; non-US / missing → nulls; no lat/long/ZIP; `private, no-store`; 405 on POST; never throws
- [X] T004 Create `netlify/functions/ubicacion.mjs` (modern syntax, `context.geo`); make T003 pass
- [X] T005 `aparezco.html`: on load, profile city first (via `CCAuth`), else `/.netlify/functions/ubicacion` with 2 s timeout; apply only if empty and untouched; note under the field

## Phase 3: User Story 2 — edit, clear, empty city (P1)

- [X] T006 `aparezco.html`: clear button "×" (40×40 px, `aria-label="Borrar la ciudad"`) visible while the field has text
- [X] T007 `aparezco.html`: block search on empty city with the friendly message; field focused and marked invalid
- [X] T008 `aparezco.html`: result shows "Buscamos en: <ciudad>"

## Phase 4: Polish

- [X] T009 `aparezco.html`: privacy note line (FR-011); `aparezco-empezar` gains categorical `ciudad`
- [X] T010 Run full suite; confirm new tests pass and no new failures
