# Quickstart: validate the Themora Digital Score

## Prerequisites

- Node 18+.
- For the live check: a deploy preview with `GOOGLE_PLACES_API_KEY` set (see `INSTRUCCIONES-APARIENCIA.md`).

## 1. Scoring rules

```bash
node --test tests/tds.test.js
```

Expected: pass. Covers the reference case (Guajiro Llc → 30, Invisible, 4 of 5 measured — see [data-model.md](data-model.md)), every band boundary (39/40, 59/60, 79/80, 94/95), zero reviews, the photo cap (10 → 100), not found (→ 0), empty "what it sells" (Visibilidad excluded), 1 review at 5.0★ vs 50 at 4.7★ (SC-002), pillars × weights = TDS ± 1, actions sorted by gain with the fixed tie order, and the forbidden-wording list from [contracts/ui-tds.md](contracts/ui-tds.md).

## 2. Function response

```bash
node --test tests/revisar-negocio-tds.test.js
```

Expected: pass. With Google responses mocked, the response has `tds` and `entradaTDS`, no `puntaje`, no business name/address inside `entradaTDS`, and Apple presence does not change `tds`.

## 3. Whole suite

```bash
node --test tests/*.test.js
```

Expected: the new tests pass; unrelated pre-existing failures (if any) are reported as they are.

## 4. On the deploy preview

1. Search a real business with few reviews: the TDS, band chip, "Evaluación parcial · 4 de 5 pilares medidos" and five pillar rows appear; Actividad says "No lo pudimos comprobar".
2. The Reputación line names the comparison ("promedio de N negocios de tu categoría" or "referencia fija de 4.7★").
3. "Lo que más sube tu TDS" lists ≤ 3 actions with "+N puntos".
4. Open the simulator, toggle "sitio web": "Simulación: NN" updates instantly; the Network tab shows no new request.
5. At 320 px width, no horizontal scroll.
6. In the Umami dashboard (or Network tab), `aparezco-resultado` carries `banda` and `parcial`, no number.
