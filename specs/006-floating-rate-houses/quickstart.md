# Quickstart: validating the Floating Rate Houses

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | Contracts: [ui-houses](./contracts/ui-houses.md), [snapshot-additive](./contracts/snapshot-additive.md)

Shows how to prove the feature works end to end without touching Supabase or deploying. Implementation details belong to `tasks.md`.

## Prerequisites

- Node 18+ (the project already uses it; no `npm install` needed).
- A modern browser; a phone or the browser's device emulator for the phone checks.
- Feature 004's code is in the repository (it is: `tasas-hipoteca.js`, `tasas-texto.js`, `netlify/functions/tasas-*.js`).

## 1. Automated checks (must be green before anything ships)

```bash
node --test tests/
```

Expected: all suites pass, including the extended ones — `tasas-texto` (states, wording, lender list rules), `tasas-navegador` (houses render, agree with the block, stale / no-data / dismiss / keyboard / refresh / storage blocked), `tasas-paginas` (CSS rules, allowlisted analytics, CSP untouched, launch gate), `tasas-hipoteca-logica` and `tasas-hipoteca-funcion` (`ultimaRevisionEn`). Report any failure as it is; never weaken a test to make it pass.

## 2. Local visual check with sample data

```bash
node tests/preview-casas.js            # serves the repo folder on http://localhost:8888
```

The preview server answers `/.netlify/functions/tasas-hipoteca` from `tests/fixtures/tasas/snapshot-casas.json` and switches `TASAS_LANZADO` to `true` **only in the copy it serves** (the file on disk stays `false`). Open `http://localhost:8888/comprar-casa.html` and choose a scenario with `?caso=`:

| URL | What you should see |
|---|---|
| `?caso=al-dia` | Two houses (30 años, 15 años), each with its rate and "Activo". No alert mark. |
| `?caso=alerta-30` | The 30-year house has the "Aviso" badge; the 15-year one does not. |
| `?caso=alerta-fed` | Both houses show "Aviso"; the panel says the Fed does not set mortgage rates and that the weekly average is not yet republished; the house numbers did not change. |
| `?caso=sin-actualizar` | Houses keep the last figure with its original date and say "Sin actualizar" (never "Activo"). |
| `?caso=revision-vieja` | Fresh figure but last agent check older than 48 h → "Sin actualizar". |
| `?caso=sin-datos` | No houses; the fixed block says the rate is not available yet. |
| `?caso=caido` | Endpoint returns 503 → no houses; the fixed block shows "No disponible ahora"; the rest of the page works. |

## 3. Behavior checklist (maps to the spec)

| # | Do this | Expected | Spec |
|---|---|---|---|
| 1 | Open the page (`al-dia`), scroll to the bottom and back | Both houses stay in the bottom-left corner, do not overlap each other, do not shift the page or add horizontal scroll | FR-001–003, US1 |
| 2 | Compare the rate/date/change on a house with the fixed block (scroll to "Tasas hipotecarias de referencia") | Identical text | FR-016, SC-003 |
| 3 | Emulate a 360 px phone and phone landscape | Houses side by side, readable, tappable; the assistant launcher (bottom-right) is not covered | FR-004, SC-002 |
| 4 | Turn on "reduce motion" in the OS/browser | No floating animation | FR-004 |
| 5 | Click a house; press Escape; click again; click the other house | Panel opens; Escape closes and returns focus to the house; the panel switches term; only one panel at a time | FR-013, US3 |
| 6 | Read the panel | Sources with what they measure and how often; Fed line; lender links (alphabetical, no figures, notice that each lender's rates vary by person); the reference-only disclaimer; link to the full block | FR-013, FR-015, FR-022 |
| 7 | Use only the keyboard (Tab, Enter/Space, Escape); turn on a screen reader | Reachable; announces term, rate, change, date, state; the panel opens and closes without a mouse | FR-005, SC-007 |
| 8 | Click into any form field on the page (e.g. the comparator) | The houses hide while the field has focus and return afterwards | R3 |
| 9 | Click "×" on the group; reload; open in a new tab | Hidden on reload in the same tab; back in a new visit; the fixed block still shows the rates | FR-014 |
| 10 | Block site storage in the browser and reload | Houses still work; dismissal only lasts for that page view; no error | FR-018 |
| 11 | Read every visible string on the houses, mark and panel | No "en vivo", "en tiempo real", advice or prediction; every figure names a source | FR-009, FR-015, SC-006 |
| 12 | Open the browser network tab on load | One snapshot request (shared with the block), no request to any other origin | R1 |
| 13 | In DevTools → Application → Analytics events / console of `ThemoraStats` | Only categorical events (`tasas-casa-vista`, `tasas-casa-abierta`, `tasas-casas-cerradas`, link events); no rates, dates or lender names | FR-019, SC-008 |
| 14 | Leave the page open, change the served fixture, wait 15 min (or shorten the interval in the preview) | Houses and block update together without a reload | FR-007, R4 |

## 4. Launch gate check (before publishing)

1. `TASAS_LANZADO` is still `false` in the committed file until the 004 launch steps in `INSTRUCCIONES-TASAS.md` are done; with it `false`, `comprar-casa.html` shows no houses and makes no snapshot request.
2. **G-LENDERS**: the owner has approved the list in `PRESTAMISTAS`, and each link was opened by hand and lands on that lender's own public rates page.
3. **G-PRIV**: in the launch commit only, the existing privacy line also mentions the session-only memory for hiding the houses.
4. **G-PLACE**: the owner confirmed placement and wording on a real phone.
5. `graphify update .` was run after the code changes; `git diff --stat` shows LF line endings.

## 5. Rollback

- Owner switch: set `tasas_config.activo = false` — the snapshot returns `{ "activo": false }` and both the houses and the fixed block disappear (no deploy needed).
- Code switch: set `TASAS_LANZADO` back to `false` in `tasas-hipoteca.js`.
