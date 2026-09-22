# Data Model: Floating Rate Houses

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

No new tables. The houses read the same public snapshot as the `#tasas` block (feature 004: [data-model](../004-mortgage-rate-agent/data-model.md), [snapshot contract](../004-mortgage-rate-agent/contracts/snapshot-public.md)) plus **one additive field**. Everything else below is a view model built in the browser and never stored, except one dismissal flag.

## Server-side change (additive)

### Snapshot field `ultimaRevisionEn`

| Aspect | Rule |
|---|---|
| Meaning | Start time (UTC ISO string) of the most recent agent run whose `resultado` is `ok` or `parcial` — i.e. a run in which at least one source answered. |
| Source | Existing table `tasas_corridas` (`corrida_en`, `resultado`). Query: latest one row where `resultado` is `ok` or `parcial`, ordered by `corrida_en` descending. No new column, no new table. |
| Value when unknown | `null` (no successful run yet, or the extra read failed). A failed extra read MUST NOT fail the whole response: the snapshot is still returned with `ultimaRevisionEn: null`. |
| Public safety | A single timestamp: no run type, no per-source result, no error text, no counts. The run log stays owner-only (004 contract guarantee). |
| Versioning | `version` stays `1`; the field is optional for consumers. |

## Client-side entities (view model, in memory only)

### Rate House (one per term: `'30'` and `'15'`)

Built by `tasas-texto.js` from `datos` (the snapshot) and "now".

| Field | Source / rule |
|---|---|
| `termino` | `'30'` or `'15'`. |
| `visible` | `datos.activo === true` **and** `datos.frescura !== 'sin_datos'` **and** `datos.terminos[termino]` exists (FR-011). Otherwise this house is not drawn. |
| `valorTexto` | `formatoTasa(valor)` + ` %` — the block's exact text (two decimals). |
| `cambioTexto` | `textoCambio(cambioPp)` — the block's exact text (▲ sube / ▼ baja / = sin cambio, in percentage points). |
| `fechaTexto` | `textoFechaFuente(fechaFuente)` — "publicado por Freddie Mac el {fecha}". |
| `estado` | `estadoCasa(datos, ahora)`: `activo` \| `sin_actualizar` (see below). |
| `marca` | `marcaDeAlerta(datos, termino)`: boolean. |
| `nombreAccesible` | One sentence combining the fields above (used as the button's accessible name). |
| `cerrada` | Whether the visitor dismissed the group for this visit (from `sessionStorage`; not part of the snapshot). |

**Consistency invariant (test-pinned)**: for the same `datos`, `valorTexto`, `cambioTexto` and `fechaTexto` are character-for-character equal to what the fixed block shows (FR-016, SC-003).

### House state

```
                  frescura = al_dia AND (ultimaRevisionEn is null OR now − ultimaRevisionEn < 48 h)
        ┌────────────────────────────────────────────────────────────────────────┐
        ▼                                                                        │
    [ activo ] ── frescura = sin_actualizar OR last check ≥ 48 h ──▶ [ sin_actualizar ]
        ▲                                                                        │
        └──────────────── a newer verified reading / check arrives ──────────────┘

    sin_datos (no verified reading, or activo=false in the snapshot) → the house is not drawn at all
```

- Transitions happen on render (first load, the 15-minute refresh, or a tab becoming visible again); nothing is stored.
- `sin_actualizar` keeps the last verified figure with its original date (FR-010) and shows the "Sin actualizar" label instead of "Activo" (FR-006).

### Alert mark

`marca` is true when any active alert in `datos.alertas` has `termino` equal to the house's term, **or** `termino === null` (Treasury and Fed alerts). The alert text shown in the panel is `textoAlerta(alerta)` from feature 004 (unchanged).

### Details Panel (one shared instance)

| Field | Rule |
|---|---|
| `terminoAbierto` | `'30'` \| `'15'` \| `null` (closed). Only one at a time. |
| `foco` | The house button that opened it; focus returns there on close. |
| Content | Built by `textoPanelCasa(termino, datos, ahora)` → structured sections (title, figure lines, alerts, sources, Fed note, lender section, disclaimer, "detalle completo" link). No HTML from data: rendered with `textContent` only. |

### Lender Link

| Field | Rule |
|---|---|
| `nombre` | Non-empty, plain text, no digits followed by `%`. |
| `url` | Starts with `https://`, no query string or fragment, unique. |
| Ordering | Alphabetical by `nombre` (no ranking). |
| Lifecycle | Hand-maintained constant in `tasas-texto.js`; owner-approved before launch (**G-LENDERS**). Never carries a rate value. |

### Dismissal flag (browser storage)

| Key | Where | Value | Lifetime |
|---|---|---|---|
| `themora_casas_cerradas` | `sessionStorage` | `"1"` | This tab/visit only; every read/write inside `try/catch`. |

## Constants

| Name | Value | Where |
|---|---|---|
| `REVISION_ATRASADA_HORAS` | `48` | `tasas-texto.js` (pure, tested) |
| `REFRESCO_MINUTOS` | `15` | `tasas-hipoteca.js` |

## Relationships

```
snapshot (004) ──► Rate House (30) ─┐
                └► Rate House (15) ─┼─► Details Panel (shared) ──► Lender Links (constant)
snapshot.alertas ──► alert mark ────┘
snapshot.ultimaRevisionEn (new) ──► house state
sessionStorage flag ──► group hidden
```
