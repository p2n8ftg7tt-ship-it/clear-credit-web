# Data Model: Mortgage Rate Watch Agent

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Storage is five small Supabase tables (SQL to be appended to `supabase-schema.sql`). All have **row-level security enabled and no policies**, so the browser (anon key) can read and write nothing; only the Netlify functions, using the service-role key, touch them (same pattern as `aparezco_contador`). Visitors get data only through the sanitized public function (see [contracts/snapshot-public.md](./contracts/snapshot-public.md)).

Rate values are stored as `numeric(5,3)` percentages (e.g. `6.950`), dates as `date`, moments as `timestamptz` (UTC).

## Entities

### Alert Threshold + launch switch — `tasas_config` (one row, `id = 'principal'`)

| Field | Type | Rule |
|---|---|---|
| `id` | text PK | always `'principal'` |
| `umbral_pp` | numeric(4,3) | default `0.125`; MUST be > 0 (FR-014, Clarifications Q2) |
| `activo` | boolean | default `false`; while false nothing is shown publicly (research R6) |
| `updated_at` | timestamptz | |

### Rate Reading — `tasas_lecturas`

One observation of one series from one source. Unique on `(fuente_id, serie, fecha_fuente)` so re-running the agent never duplicates.

| Field | Type | Rule |
|---|---|---|
| `id` | bigint identity PK | |
| `fuente_id` | text | `freddie-pmms` \| `tesoro-10a` \| `nyfed-objetivo` (source catalog lives in code, see [contracts/source-feeds.md](./contracts/source-feeds.md)) |
| `serie` | text | `pmms30` \| `pmms15` \| `dgs10` \| `fed_hasta` \| `fed_desde` |
| `valor` | numeric(5,3) | percentage as published by the source, never altered (Freddie Mac terms) |
| `fecha_fuente` | date | the date **the source** attaches to the value (FR-030) |
| `obtenida_en` | timestamptz | when the agent retrieved it |
| `estado` | text | `verificada` \| `retenida` (see states below) |
| `nota` | text null | why held (e.g. `salto > 1.0 pp`) |

**Validation (plausibility, FR-019)**: `pmms*` ∈ [1, 15]; `dgs10` ∈ [0, 15]; `fed_*` ∈ [0, 20]; a `pmms*` value differing from the previous `pmms*` by more than **1.0 pp** is `retenida`.

**States**: `verificada` (passed checks; eligible to be published) → published means it is referenced by the current snapshot. `retenida` → never published; owner releases it by setting `estado = 'verificada'` (documented in the instructions); the next run picks it up.

### Published snapshot — `tasas_publicado` (one row, `id = 'actual'`)

| Field | Type | Rule |
|---|---|---|
| `id` | text PK | `'actual'` |
| `snapshot` | jsonb | headline figures **as of the last publish run**: per term `{valor, previo, cambio_pp, fecha_fuente}`, plus the Treasury/Fed baselines used by alerts |
| `publicado_en` | timestamptz | time of the last **successful publish run** (Mon/Tue) |

Only a Monday/Tuesday run writes this row (FR-006); watch-only days never change the headline (FR-029). `cambio_pp = valor − previo`, computed by Themora and labeled as such.

### Rate Alert — `tasas_alertas`

| Field | Type | Rule |
|---|---|---|
| `id` | bigint identity PK | this is the id the browser remembers when a visitor dismisses the banner (FR-027) |
| `tipo` | text | `movimiento_semanal` \| `tesoro_10a` \| `fed_objetivo` |
| `termino` | text null | `'30'` \| `'15'` for weekly moves; null for Treasury and Fed |
| `direccion` | text | `sube` \| `baja` |
| `magnitud_pp` | numeric(5,3) | absolute size in percentage points; for `fed_objetivo`, the change of the upper bound |
| `datos` | jsonb | extra facts for wording, e.g. Fed `{desde:"3.50–3.75", hasta:"3.75–4.00"}` |
| `fecha_fuente` | date | date of the source figure that triggered it |
| `fuente_id` | text | source that triggered it (named on the alert, FR-011) |
| `detectada_en` | timestamptz | |
| `clave` | text UNIQUE | dedupe key = `tipo:termino:direccion:baseline_id:floor(|Δ|/T)` — the same condition never raises twice (research R7) |
| `estado` | text | `activa` \| `superada` \| `despejada` |
| `cerrada_en` | timestamptz null | |

**State transitions**

```text
(nuevo) ──cumple regla y clave inédita──▶ activa
activa ──corrida de publicación (lun/mar)──▶ superada     # FR-013
activa (tesoro_10a) ──|Δ| ≤ T/2 o cambia la base──▶ despejada
superada / despejada ──(final)                            # una clave cerrada no se reabre
```

Fed rule: raised only when `fed_hasta` differs from the previous stored `fed_hasta`; a "no change" decision creates nothing (Clarifications Q5).

### Agent Run — `tasas_corridas`

| Field | Type | Rule |
|---|---|---|
| `id` | bigint identity PK | |
| `corrida_en` | timestamptz | start time |
| `tipo` | text | `publicacion` (Mon/Tue) \| `vigilancia` (other days) |
| `resultado` | text | `ok` (all sources answered) \| `parcial` (some failed) \| `fallo` (none answered or write failed) |
| `fuentes` | jsonb | `{ "freddie-pmms": "ok", "tesoro-10a": "error: timeout", … }` — error text is short, no secrets |
| `publicadas` | int | readings copied into the snapshot this run |
| `retenidas` | int | readings held this run (FR-019) |
| `alerta_nueva` | boolean | |
| `duracion_ms` | int | |

Only the last ~60 runs are read by the owner view; older rows are harmless (about 365 rows/year).

### Rate Source (not a table)

A code-side catalog (in `tasas-hipoteca-logica.js`, mirrored in the public snapshot as display metadata): `id`, `nombre`, `mide` (what it measures, one plain-Spanish line), `frecuencia`, `url`, `atribucion`, `rol` (`titular` \| `senal`), `mostrar_cifras` (bool; FR-018). v1 catalog: `freddie-pmms` (titular, shows figures), `tesoro-10a` (señal), `nyfed-objetivo` (señal). MND and MBA are **absent** (research R3).

## Relationships

```text
tasas_config (1) ── umbral_pp ──▶ read by every agent run
tasas_lecturas (many) ──◀ tasas_publicado.snapshot (references the latest verified per series, by copy)
tasas_lecturas (baseline) ──◀ tasas_alertas.clave (baseline_id inside the key)
tasas_corridas (many) ── logs ──▶ readings written / alerts raised that run
```

## Derived (never stored)

- **Freshness** (`al_dia` / `sin_actualizar` / `sin_datos`): pure function of `publicado_en` and "now" (research R8).
- **Next refresh**: next Monday or Tuesday 13:00 UTC after "now".
- **Banner text / alert text**: built in the browser from the structured alert fields by `tasas-texto.js`; **no prose is stored** in the database, so wording rules live in one tested place.
