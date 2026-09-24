# Data Model: Themora Digital Score (TDS)

Nothing is stored (FR-018). Shapes exchanged between `tds.js`, the function and the page.

## EntradaTDS (input to `calcular`)

| Field | Type | Source / rule |
|-------|------|---------------|
| `encontrado` | boolean | listing found by name + city |
| `calificacion` | number \| null | 1–5 |
| `totalResenas` | integer ≥ 0 | null → 0 |
| `sitioWeb` | boolean | link present on the listing |
| `horarioCompleto` | boolean | |
| `fotos` | integer 0–10 \| null | null → Completitud not measurable |
| `posicionGiro` | integer 1–10 \| null | null = not in category results |
| `giroMedible` | boolean | false when "what it sells" was empty → Visibilidad not measurable |
| `referencia` | `{ valor: number, origen: "competencia" \| "fija", cantidad: integer }` | FR-004 |

Constants (in `tds.js`): `PESOS = { reputacion: .30, visibilidad: .25, fundamentos: .20, completitud: .15, actividad: .10 }`, `M = 10`, `META_RESENAS = 50`, `LAMBDA = 0.05`, `TOPE_FOTOS = 10`, `REFERENCIA_FIJA = 4.7`, `MIN_COMPETENCIA = 3`, `VIS_SOLO_NOMBRE = 30`.

## Pilar

| Field | Type | Rule |
|-------|------|------|
| `clave` | `reputacion \| visibilidad \| fundamentos \| completitud \| actividad` | |
| `peso` | number | original weight |
| `pesoAplicado` | number | rescaled weight (0 when not measurable) |
| `valor` | number 0–100 \| null | null = "No lo pudimos comprobar" |
| `razon` | string | one Spanish line with the real figures |

## ResultadoTDS (output of `calcular`)

| Field | Type | Rule |
|-------|------|------|
| `tds` | integer 0–100 | round once at the end; 0 when `encontrado` is false |
| `banda` | `invisible \| vulnerable \| saludable \| fuerte \| dominante` | 0–39 / 40–59 / 60–79 / 80–94 / 95–100 |
| `pilares` | Pilar[5] | fixed order above |
| `parcial` | boolean | any pilar `valor === null` |
| `pilaresMedidos` | integer | count of measured pilares |
| `multiplicador` | 0 \| 1 | 0 only when not found |
| `referencia` | copy of input `referencia` | shown in the Reputación line |

## Accion

| Field | Type | Rule |
|-------|------|------|
| `clave` | `sitioweb \| horario \| fotos \| resenas` | |
| `texto` | string | owner-doable, Spanish |
| `puntos` | integer ≥ 1 | recomputed TDS − current TDS |

`acciones(entrada)` → up to 3, sorted by `puntos` desc, ties in the order `sitioweb, horario, fotos, resenas`.

## Reference case — "Guajiro Llc" (tests + methodology page)

Input: found, 5.0★, 1 review, no website, incomplete hours, 0 photos, not in category (found by name), `giroMedible: true`, reference 4.7 fixed.

| Pilar | Value |
|-------|-------|
| Reputación | 63.8 (adjusted 4.727★ → 94.5; volume 17.6) |
| Visibilidad | 30 |
| Fundamentos | 0 (website no, hours no) |
| Completitud | 0 |
| Actividad | not measurable |

Rescaled weights over 0.90 → TDS = (0.30·63.78 + 0.25·30) / 0.90 = **29.6 → 30**, band **Invisible**, partial (4 of 5).
