# Tasks: Themora Digital Score (TDS) on "¿Aparezco?"

**Input**: plan.md, spec.md, research.md, data-model.md, contracts/
**Tests**: included (FR-016, quickstart).

## Phase 1: Setup

- [X] T001 Confirm the baseline suite (`node --test tests/*.test.js`) and note pre-existing failures

## Phase 2: Foundational — scoring module (blocks all stories)

- [X] T002 [P] Write `tests/tds.test.js`: Guajiro reference case, band boundaries, zero reviews, photo cap, not found, empty "what it sells", SC-002, pillars × weights = TDS ± 1, actions order, forbidden wording
- [X] T003 Create `tds.js` (UMD: `window.ThemoraTDS` + CommonJS): constants, `referencia`, `calcular`, `banda`, `acciones`, `simular`, band texts; make T002 pass

## Phase 3: User Story 1 + 2 — TDS, band and five pillars (P1)

- [X] T004 [P] [US1] Write `tests/revisar-negocio-tds.test.js` (Google mocked): response has `tds` + `entradaTDS`, no `puntaje`, no name/address in `entradaTDS`, Apple does not change `tds`
- [X] T005 [US1] `netlify/functions/revisar-negocio.js`: build `EntradaTDS` from Google data, return `tds` + `entradaTDS`, drop `puntaje` and weights from `evaluarParametros`
- [X] T006 [US1] `aparezco.html`: load `tds.js`; replace `#apScore` with TDS number, band chip, band sentence, partial label; remove verdict titles that claim lost customers
- [X] T007 [US2] `aparezco.html`: `#apPilares` five rows (weight, bar, reason; "No lo pudimos comprobar" when null), readable at 320 px
- [X] T008 [US2] `aparezco.html`: retitle findings as "Lo que encontramos" (no score of its own)

## Phase 4: User Story 3 — top 3 actions (P2)

- [X] T009 [US3] `aparezco.html`: `#apAcciones` "Lo que más sube tu TDS" from `ThemoraTDS.acciones(entradaTDS)`, hidden when empty

## Phase 5: User Story 4 — simulator (P3)

- [X] T010 [US4] `aparezco.html`: `<details id="apSimulador">` with website/hours toggles, photo selector, review target; "Simulación: NN (Banda)"; reset; `aparezco-simular` event once per control

## Phase 6: Polish

- [X] T011 `aparezco.html`: `<details id="apMetodo">` "Cómo calculamos el TDS" (FR-019)
- [X] T012 Analytics: `aparezco-resultado` sends `banda`, `parcial`, `con_ia`, `encontrado` only (FR-017)
- [X] T013 Run full suite; confirm new tests pass and no new failures; LF line endings in new/edited files
