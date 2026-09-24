# Research: Themora Digital Score (TDS) on "¿Aparezco?"

**Feature**: 007-themora-digital-score · **Date**: 2026-09-23

## R1 — Where the scoring rules live

- **Decision**: One UMD module at the site root, `tds.js` (browser global `ThemoraTDS`, CommonJS export), required by `netlify/functions/revisar-negocio.js` via `require("../../tds.js")` and loaded by `aparezco.html` for the actions list and the simulator.
- **Rationale**: FR-013/FR-015 need the same formula in the browser (instant recompute, no new search) and on the server (the authoritative result). Constitution IV: one source, tested. Netlify's function bundler follows relative `require` paths outside `netlify/functions/`, so the root file is packaged with the function.
- **Alternatives considered**: (a) Server-only scoring + a second browser copy for the simulator — two copies drift; rejected. (b) Browser-only scoring — the function response would carry no score for other consumers and tests would need a DOM; rejected.

## R2 — Visibility rule and the empty "what it sells" field

- **Decision**: Rule B from the clarification (top 3 = 100; 4–10 = 100 − 15·(pos − 3); found by name only = 30; not found = 0). When the "what it sells" field was empty, the category search today reuses the business name, which almost always ranks the business #1; in that case Visibilidad is marked **not measurable** and excluded (FR-008), instead of an inflated 100.
- **Rationale**: Honest scoring; the spec edge case asks to mark it partial, and exclusion is the one partial treatment the formula already defines.

## R3 — Photos cap

- **Decision**: The Places details field returns at most 10 photos. `fotos >= 10` → Completitud = 100; otherwise 100·(1 − e^(−0.05·fotos)).
- **Rationale**: FR-007. Without it the pillar could never exceed ~39 because of the source, not the business.
- **Alternative considered**: Rescaling λ so that 10 photos ≈ 100 — changes the owner's methodology for all counts; rejected.

## R4 — Reference rating (prior C)

- **Decision**: Use the average rating of competitors from the category search when **≥ 3** have a rating (the function already computes up to 5); else 4.7. The response says which one and how many businesses.
- **Rationale**: FR-004; docx asks to show the comparison group and its size.
- **Note**: The docx suggests a median to reduce the influence of very large businesses; with ≤ 5 competitors the difference is small, and the `.py` uses the mean. Kept the mean; revisit when validation data exists.

## R5 — Unmeasurable items

- **Decision**: Claim status, reply rate and last-activity date are not in the Places data used. Actividad is excluded (weights rescaled over the remaining pillars); Fundamentos is the mean of website + full hours only; the reality multiplier is 0 (not found) or 1. The result carries `parcial: true` and `pilaresMedidos: n`.
- **Rationale**: FR-002, FR-006, FR-008, FR-009; docx: "un dato desconocido no debe convertirse automáticamente en cero".

## R6 — Actions (top 3) and the simulator

- **Decision**: Candidate actions the owner can do themselves, each simulated by changing one input to its goal and recomputing with `tds.js`:
  1. `sitioweb` → website linked
  2. `horario` → full hours
  3. `fotos` → 10 photos (source cap)
  4. `resenas` → 50 reviews at the current rating (or at the reference rating if there are none)
  Sorted by gain (whole points), ties in the order above; items already met or with gain < 1 are skipped; max 3. Visibility is not an action: the owner cannot set their position directly (the existing suggestions already explain how to improve it).
- **Simulator (P3)**: toggles for website and hours, a photo selector (0–10) and a review target (current, 10, 25, 50, 100). Recomputed in the page with `tds.js`; labeled "Simulación"; no request.
- **Rationale**: FR-013–FR-015; no action involves buying a service (FR-014).

## R7 — Band texts (principle I)

- **Decision**: Replace today's `fraseScore` and verdict titles ("Hoy pierdes clientes por esto…", "hay parámetros concretos que te están costando clientes") with band texts limited to what was observed (see `contracts/ui-tds.md`). The existing fixed-rule suggestions and AI prompt already avoid promises; they stay.
- **Rationale**: FR-012 / SC-005. The current texts claim lost customers, which the constitution forbids.

## R8 — Analytics

- **Decision**: `aparezco-resultado` sends `banda` (`invisible | vulnerable | saludable | fuerte | dominante`) and `parcial` (`si | no`) in place of `veredicto` and the numeric `puntaje`; `con_ia` and `encontrado` stay. `aparezco-simular` (P3) sends only `control` (`sitioweb | horario | fotos | resenas`).
- **Rationale**: FR-017; constitution II (the numeric `puntaje` sent today is a violation that this feature removes).

## R9 — Rounding

- **Decision**: Pillars computed in full precision; the TDS is `Math.round` of the final weighted value once; pillars are shown rounded to whole numbers. Tests check the shown pillars × rescaled weights reproduce the TDS within ±1.
