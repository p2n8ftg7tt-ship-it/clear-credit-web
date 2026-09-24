# Contract: TDS block on `aparezco.html`

Order inside `#pasoResultado`, top to bottom:

1. **Score** (`#apScore`, replaced): big number `tds`, "de 100", title "Themora Digital Score", band chip (name + color, e.g. "Vulnerable"), band sentence, and — when `parcial` — "Evaluación parcial · N de 5 pilares medidos".
2. **Pilares** (new `#apPilares`): five rows in fixed order; each shows name, weight ("30 %"), a 0–100 bar with the whole-number value, and `razon`. Unmeasurable → no bar, text "No lo pudimos comprobar" + reason. Readable at 320 px width without horizontal scroll.
3. **Acciones** (new `#apAcciones`, P2): "Lo que más sube tu TDS", up to 3 items "texto — +N puntos". Hidden when there are none.
4. **Simulador** (new `#apSimulador`, P3, collapsed `<details>`): controls from research R6; shows "Simulación: NN (Banda)" next to the real TDS; "Volver a mis datos reales" resets.
5. **Ficha encontrada** (`#apFound`) — unchanged.
6. **Lo que encontramos** (`#apFindings`, retitled) — existing rows, unchanged content.
7. **Qué hacer** (`#apTodo`) — unchanged.
8. **Cómo calculamos el TDS** (new `<details id="apMetodo">`): the five pillars and weights; adjusted rating in words; unmeasurable items excluded, not zero; the comparison group; "metodología inicial de Themora, todavía no validada con resultados de negocios"; "Contratar a Themora nunca cambia tu puntaje."

## Band chip

| Banda | Range | Color token | Sentence (observed-only) |
|-------|-------|-------------|--------------------------|
| Invisible | 0–39 | `--tds-rojo` | "En las búsquedas que hicimos, a tu negocio le cuesta aparecer y a tu ficha le faltan datos básicos." |
| Vulnerable | 40–59 | `--tds-naranja` | "Tu ficha tiene lo básico, pero en las búsquedas que hicimos todavía hay pilares flojos." |
| Saludable | 60–79 | `--tds-amarillo` | "Tu ficha está bien encaminada; los pilares de abajo muestran qué queda por completar." |
| Fuerte | 80–94 | `--tds-verde` | "Tu ficha está muy completa y apareces bien en las búsquedas que hicimos." |
| Dominante | 95–100 | `--tds-azul` | "En las búsquedas que hicimos, tu ficha cumple casi todo lo que medimos." |
| (not found) | 0 | `--tds-rojo` | "No encontramos una ficha de tu negocio buscando «nombre, ciudad». El primer paso es crearla." |

Chip text always includes the band name (color is never the only signal). Chip text/background contrast ≥ 4.5:1.

## Forbidden wording (tested)

Any text produced by `tds.js` or the band table MUST NOT match: `pierd`, `perdiendo`, `cuesta(n)? clientes`, `regal`, `no existes`, `garantiz`, `seguro que`, `%.*clientes`.

## Analytics

- `aparezco-resultado`: `{ banda, parcial, con_ia, encontrado }` — no numbers.
- `aparezco-simular`: `{ control }` — once per control per result.
