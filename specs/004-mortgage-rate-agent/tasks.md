---

description: "Task list for Mortgage Rate Watch Agent (Buy-a-House page)"
---

# Tasks: Mortgage Rate Watch Agent (Buy-a-House page)

**Input**: Design documents from `/specs/004-mortgage-rate-agent/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The constitution (Flujo de desarrollo → Pruebas; Principio IV) requires `node --test tests/` coverage for any rule-based logic, and the plan lists three new test files. A failing test is reported as is; a test is never weakened to pass.

**Organization**: Grouped by user story (US1–US5 from spec.md). US1 is the MVP; US2 and US3 are also P1 and should follow immediately.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US5, mapped to the user stories in spec.md
- All paths are relative to the repository root `C:\Users\drcor\Desktop\MyWeb\` (flat static site; there is no `src/`). Note the two files named `tasas-hipoteca.js`: the **root** one is browser code, the one under `netlify/functions/` is the public function.

## Global rules for every task

- Keep **LF** line endings; after editing a file run `git diff --stat <file>` and confirm the diff is not the whole file (constitution: Formato de archivos).
- No new dependency, framework, build step or external browser origin (CSP in `netlify.toml` stays unchanged). Server code uses Node's built-in `fetch` and `AbortController`.
- No secret in any file. The upstream feeds need no key. Reuse the existing env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- All generated wording follows [contracts/ui-block-and-banner.md](./contracts/ui-block-and-banner.md) §3: state only what changed; no advice, prediction or urgency; figures shown exactly as Freddie Mac published them.
- Text shown to people is Spanish (es-US); code comments follow the surrounding file (Spanish).
- Do **not** publish or deploy from these tasks, do **not** set `tasas_config.activo = true`, and do **not** change `TASAS_LANZADO` to `true`. Publishing and the launch switches are owner actions listed in the last phase (T055–T059).
- Nothing about the feature may be visible to the public before launch (constitution: Docs junto al cambio): the privacy line (T057) and the search entry (T058) are added only in the launch commit, and the browser script makes no request while `TASAS_LANZADO` is `false`.

---

## Phase 1: Setup

**Purpose**: known-good baseline before touching anything.

- [X] T001 Run `node --test tests/` from the repo root and record the result. If anything already fails, stop and report it before changing code.
- [X] T002 [P] Run `graphify query "comprar-casa rate watch section, admin-data verifyCaller, admin.html sections"` and skim the result so the files you touch match the graph; note any file in it that the plan does not list.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: database tables, schedule/blocking config and the two shared modules every story builds on.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

- [X] T003 Append to `supabase-schema.sql` (Spanish comments, same style as `aparezco_contador`) the tables `public.tasas_config`, `public.tasas_lecturas`, `public.tasas_publicado`, with these constraints verbatim from data-model.md. **`tasas_config`**: `id text primary key` (always `'principal'`); `umbral_pp numeric(4,3)` default `0.125`, "MUST be > 0" → `check (umbral_pp > 0)`; `activo boolean` default `false`; `updated_at timestamptz`; seed one row `('principal')` with `on conflict do nothing`. **`tasas_lecturas`**: `id bigint` identity primary key; `fuente_id text` (`freddie-pmms` | `tesoro-10a` | `nyfed-objetivo`); `serie text` (`pmms30` | `pmms15` | `dgs10` | `fed_hasta` | `fed_desde`); `valor numeric(5,3)`; `fecha_fuente date`; `obtenida_en timestamptz`; `estado text` (`verificada` | `retenida`); `nota text` null; `unique (fuente_id, serie, fecha_fuente)`. **`tasas_publicado`**: `id text primary key` (`'actual'`); `snapshot jsonb`; `publicado_en timestamptz`. Use `check (... in (...))` for the enumerated text columns.
- [X] T004 Append to `supabase-schema.sql` (after T003 — same file) `public.tasas_alertas` and `public.tasas_corridas`. **`tasas_alertas`**: `id bigint` identity primary key; `tipo text` (`movimiento_semanal` | `tesoro_10a` | `fed_objetivo`); `termino text` null (`'30'` | `'15'`; null for Treasury and Fed); `direccion text` (`sube` | `baja`); `magnitud_pp numeric(5,3)`; `datos jsonb`; `fecha_fuente date`; `fuente_id text`; `detectada_en timestamptz`; `clave text unique`; `estado text` (`activa` | `superada` | `despejada`); `cerrada_en timestamptz` null. **`tasas_corridas`**: `id bigint` identity primary key; `corrida_en timestamptz`; `tipo text` (`publicacion` | `vigilancia`); `resultado text` (`ok` | `parcial` | `fallo`); `fuentes jsonb`; `publicadas int`; `retenidas int`; `alerta_nueva boolean`; `duracion_ms int`. Then `alter table … enable row level security;` for **all five** `tasas_*` tables with **no** `create policy` (only the service-role key may touch them), and a comment saying so.
- [X] T005 [P] Edit `netlify.toml`: (a) add `[functions."tasas-agente"]` with `schedule = "0 13 * * *"` (UTC; comment: 13:00 UTC = 9 am EDT / 8 am EST, runs only on the production deploy); (b) add a `[[redirects]]` 404 rule (`from = "/INSTRUCCIONES-TASAS.md"`, `to = "/index.html"`, `status = 404`, `force = true`) next to the other `INSTRUCCIONES-*` rules. Do **not** touch the Content-Security-Policy header.
- [X] T006 Create `netlify/functions/tasas-hipoteca-logica.js` (CommonJS, no dependencies, Spanish comments) exporting only the base: the **source catalog** for `freddie-pmms` (rol `titular`, `mostrar_cifras` true, atribución "Fuente: Freddie Mac PMMS", url `https://www.freddiemac.com/pmms`, frecuencia "Semanal, los jueves"), `tesoro-10a` (rol `senal`) and `nyfed-objetivo` (rol `senal`) with fields `id, nombre, mide, frecuencia, url, atribucion, rol, mostrar_cifras` (fill `mide` in T041; use placeholders now) and **no** MND or MBA entry; constants `UMBRAL_POR_DEFECTO = 0.125`, `SALTO_MAXIMO_PP = 1.0`, `RANGOS = { pmms: [1,15], dgs10: [0,15], fed: [0,20] }`, `HORA_PUBLICACION_UTC = 13`, `GRACIA_HORAS = 3`; and a helper `redondear3(n)`. Export with `module.exports` (same style as `leyes-digest.js`).
- [X] T007 [P] Create `tasas-texto.js` at the repo root as a browser+Node module (same wrapper style as `zyron-leyes.js`) exporting the base only: one `TEXTOS` object holding every fixed Spanish string (title "Agente de tasas", the disclaimer exactly "Promedios nacionales de referencia para fines educativos. No son una oferta, una aprobación ni la tasa que te darían a ti.", pill labels "Al día" / "Sin actualizar" / "Aún sin datos", stale notice "No pudimos actualizar…", empty state "Todavía no está disponible"), number helpers `formatoTasa(n)` (two decimals) and `formatoPp(n)` (up to three decimals, "puntos porcentuales"), a Spanish short-date helper `fechaCorta(iso)` (e.g. "17 sep"), and the exported list `PALABRAS_PROHIBIDAS` from contracts/ui-block-and-banner.md §3. Add a header comment `TODO(NATIVE_REVIEW)` stating that only Spanish exists and any AI-written translation must be reviewed by native speakers before publishing (Principio V).

**Checkpoint**: tables, schedule/blocking config and both base modules exist; user stories can begin.

---

## Phase 3: User Story 1 — See today's reference rates with source and date (Priority: P1) 🎯 MVP

**Goal**: a visitor to Comprar casa sees the 30-year and 15-year Freddie Mac reference rates, the change vs the previous reading, the survey's publication date, the source with a link, and the disclaimer. Behind the launch switch (`activo`), so nothing shows publicly until the owner turns it on.

**Independent Test**: with a published snapshot row, `activo = true` and `TASAS_LANZADO = true` (in a local, uncommitted copy of `tasas-hipoteca.js`), open `comprar-casa.html#tasas`: both terms show a rate, a change, a date, the source link and the disclaimer, at 360 px without sideways scrolling. With `activo = false` nothing about rates is visible.

### Tests for User Story 1 (write first; they fail until implementation)

- [X] T008 [P] [US1] Create fixtures in `tests/fixtures/tasas/`: `pmms-ok.csv` (header `date,pmms30,pmms30p,pmms15,pmms15p,pmms51,pmms51p,pmms51m,pmms51spread`, dates `M/D/YYYY`, newest last, at least 4 rows, the last two with both `pmms30` and `pmms15`, plus a trailing empty line), `pmms-columnas-vacias.csv` (newest row has empty `pmms15`, so the parser must fall back to the last row where both are numbers), `pmms-malformado.csv` (missing the `pmms30` column), `pmms-salto.csv` (last row differs from the previous by more than 1.0 pp) and `pmms-vacio.csv` (header only).
- [X] T009 [P] [US1] Create `tests/tasas-hipoteca-logica.test.js` (`node:test`, `assert/strict`) with the PMMS cases: `parsePmms` takes the last two rows whose `pmms30` and `pmms15` are both numeric, converts `M/D/YYYY` to ISO, ignores blank trailing lines, returns an error object (not a throw and not a guess) for malformado/vacío; values are returned exactly as in the file (no rounding); `calcularCambio` returns `valor − previo` to 3 decimals; plausibility: `pmms*` outside `[1, 15]` → `retenida`, a jump `> 1.0` pp vs previous → `retenida` with `nota` "salto > 1.0 pp"; `construirSnapshotTitular` returns per term `{valor, previo, cambioPp, fechaFuente}` and never includes any signal-source value in `terminos`.
- [X] T010 [P] [US1] Create `tests/tasas-texto.test.js` with the block-text cases: `textoCifra`, `textoCambio` (sube / baja / sin cambio with ▲ ▼ =, size in puntos porcentuales), the "publicado por Freddie Mac el {fecha}" line, the disclaimer is present verbatim, and a loop asserting **no string in `TEXTOS` or returned by these builders contains a forbidden word** (whole-word, case- and accent-insensitive, from `PALABRAS_PROHIBIDAS`).
- [X] T011 [P] [US1] Create `tests/tasas-paginas.test.js` with the block cases (static file reads): `comprar-casa.html` contains `<section id="tasas"` with the `hidden` attribute and the classes `rate-watch-section`; the section's markup contains **no typed rate number** (regex for `\d+\.\d+ ?%` inside the section is empty); both script tags `tasas-texto.js` and `tasas-hipoteca.js` are present with `defer`; `netlify.toml` still has the original CSP line byte-for-byte (read it from the test itself, not from memory — assert the line starts `Content-Security-Policy = "default-src 'self'` and its `connect-src` value does not gain any new origin beyond the current ones: `'self' https://*.supabase.co https://cloud.umami.is https://gateway.umami.is`); **pre-launch cleanliness (self-updating)**: read `TASAS_LANZADO` from `tasas-hipoteca.js` — while it is `false`, `privacidad.html` must NOT contain "aviso de tasas hipotecarias" and `site-search-index.js` must NOT contain `comprar-casa.html#tasas`; once it is `true`, both MUST be present. A launch that forgets T057 or T058, or a build that adds them early, fails `node --test tests/`.

### Implementation for User Story 1

- [X] T012 [US1] In `netlify/functions/tasas-hipoteca-logica.js` implement and export `parsePmms(csvText)`, `evaluarPlausibilidad(serie, valor, previo)`, `calcularCambio(valor, previo)` and `construirSnapshotTitular(lectura30, lectura15)` exactly as the T009 tests describe (contract: [contracts/source-feeds.md](./contracts/source-feeds.md) parsing rules; data-model plausibility: `pmms*` ∈ [1, 15]; jump > 1.0 pp ⇒ `retenida`).
- [X] T013 [P] [US1] In `tasas-texto.js` implement and export `textoCifra(termino, dato)`, `textoCambio(cambioPp)`, `textoFechaFuente(fechaIso)` and the block's fixed strings so T010 passes; no advice, no prediction, "publicado por Freddie Mac".
- [X] T014 [US1] Create `netlify/functions/tasas-agente.js` (scheduled function; exports `handler`; Spanish comments; reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`). For this story it does the headline path only: fetch `https://www.freddiemac.com/pmms/docs/PMMS_history.csv` with an 8-second `AbortController` timeout and a fixed `User-Agent` that names the site; `parsePmms` → plausibility; upsert the readings into `tasas_lecturas` (`on_conflict=fuente_id,serie,fecha_fuente`, `estado` `verificada` or `retenida`); build the snapshot from the latest **verificada** readings and upsert it into `tasas_publicado` (`id = 'actual'`, `publicado_en = now`). Use the same service-key header logic as `cabecerasServicio` in `netlify/functions/admin-data.js` (new `sb_` keys go only in `apikey`). On any fetch/parse error write nothing and do not throw; keep error text to a short category (`timeout`, `http 503`, `formato inesperado`). Weekday logic, run log and the other feeds come in later stories.
- [X] T015 [US1] Create `netlify/functions/tasas-hipoteca.js` (public GET function, [contracts/snapshot-public.md](./contracts/snapshot-public.md)): read `tasas_config` and `tasas_publicado` with the service key; if `activo` is false return `200 { "version": 1, "activo": false }`; otherwise return `version, activo, generadoEn, frescura` (`"al_dia"` when a snapshot exists, `"sin_datos"` when not — refined in US2), `publicadoEn, proximaActualizacion` (null for now), `fuente` (from the catalog), `terminos` and `alertas: []`. Headers: `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`. On database error return `503 { "estado": "no_disponible" }` with `Cache-Control: no-store`. Reject non-GET. Never return run logs, error text, thresholds or held readings.
- [X] T016 [US1] Create `tasas-hipoteca.js` at the repo root (browser, `'use strict'`, no framework): declare `const TASAS_LANZADO = false;` at the top (flipped to `true` only in the launch commit, T059); if it is not `true`, do nothing at all — no request, no rendering, no banner. If `#tasas` exists, fetch `/.netlify/functions/tasas-hipoteca`; when the response says `activo` is not true keep the section `hidden`; otherwise fill the two figures, changes, "publicado por Freddie Mac el …", "Revisado"/"Próxima revisión" placeholders and the disclaimer using `window.TasasTexto` from `tasas-texto.js`; after launch, on any failure (network error, non-200, invalid JSON, 503) make the section visible with the honest "no disponible ahora" message and render no banner (SC-005); never throw. Expose nothing globally except what the page needs.
- [X] T017 [US1] Edit `comprar-casa.html`: insert `<section id="tasas" class="rate-watch-section section" hidden>` between the closing `</section>` of `.citizen-myth` (line ~434) and `<section id="pasos">` (line ~437), reusing the existing (currently unused) classes `rate-watch-layout`, `rate-watch-card`, `rate-agent-title`, `rate-agent-icon`, `rate-status`, `rate-delivery`, `rate-time`, `rate-source-links`, `rate-disclaimer` from the page's `<style>` (lines ~30–53); empty elements with ids for the two figures, changes, dates, pill, alerts area and sources area (no rate number typed in the HTML); heading in Spanish. Add `<script src="tasas-texto.js" defer></script>` and `<script src="tasas-hipoteca.js" defer></script>` in the script block after `nav.js` (line ~1250) and before `analytics.js` (line ~1391).
- [X] T018 [US1] Run `node --test tests/` — T009, T010, T011 and all existing suites must pass. Then `git diff --stat` on the edited files (LF check).

**Checkpoint**: US1 is complete and testable on its own (with the snapshot loaded by hand or by one manual "Run now"); nothing is public while `activo = false`.

---

## Phase 4: User Story 2 — Monday/Tuesday refresh, honest about freshness (Priority: P1)

**Goal**: the agent runs every day but only **publishes** on Mondays and Tuesdays; the page always says when it was last refreshed and when the next refresh is due; a failed or missed refresh keeps the last verified figures, marked "not refreshed", and never shows an invented number.

**Independent Test**: simulate a Monday and a Tuesday run (with `TASAS_FORZAR_TIPO` or fixtures) and confirm the displayed "revisado" date advances; simulate a missed slot and confirm the block keeps the old figures and dates with the visible "No pudimos actualizar" notice; with no snapshot at all confirm the empty state (no placeholder numbers).

### Tests for User Story 2

- [X] T019 [P] [US2] Extend `tests/tasas-hipoteca-logica.test.js`: `tipoDeCorrida(fechaUtc, forzar)` → `publicacion` for Monday and Tuesday (UTC weekday 1 and 2), `vigilancia` for the other five days, and the `forzar` override (`publicacion` / `vigilancia`) wins; `proximaActualizacion(ahora)` → the next Monday or Tuesday 13:00 UTC strictly after `ahora` (Tuesday 13:00 → next Monday 13:00; Sunday → Monday); `calcularFrescura(publicadoEn, ahora)` → `al_dia` when the last publish is at or after the most recent scheduled slot (with `GRACIA_HORAS = 3`), `sin_actualizar` when a slot passed without a newer publish, `sin_datos` when `publicadoEn` is null; `resultadoDeCorrida(estadoPorFuente)` → `ok` (all answered), `parcial` (some failed), `fallo` (none answered).
- [X] T020 [P] [US2] Extend `tests/tasas-texto.test.js`: stale notice appears only for `sin_actualizar` and names the original dates; empty state text for `sin_datos` contains no digits; `textoProximaRevision` names the next day; the pill label maps `al_dia`/`sin_actualizar`/`sin_datos`; none of these strings contains a forbidden word.

### Implementation for User Story 2

- [X] T021 [US2] In `netlify/functions/tasas-hipoteca-logica.js` implement and export `tipoDeCorrida`, `proximaActualizacion`, `calcularFrescura`, `resultadoDeCorrida` per T019 (pure, take `Date` arguments, no hidden `Date.now()` inside).
- [X] T022 [P] [US2] In `tasas-texto.js` implement `textoFrescura(frescura, datos)`, `textoProximaRevision(iso)`, `textoRevisado(iso)` and the pill mapping so T020 passes.
- [X] T023 [US2] Update `netlify/functions/tasas-agente.js`: compute `tipoDeCorrida` (honor the optional env var `TASAS_FORZAR_TIPO`, values `publicacion` | `vigilancia`, documented as a temporary test switch); on `publicacion` upsert `tasas_publicado` as in US1; on `vigilancia` record readings but **never** write `tasas_publicado`; record the per-source outcome (`ok` or the short error category) and insert one row into `tasas_corridas` (`corrida_en`, `tipo`, `resultado`, `fuentes`, `publicadas`, `retenidas`, `alerta_nueva` false for now, `duracion_ms`) at the end of every run, including runs where a source failed; a source failure keeps the last published snapshot unchanged (FR-008); make the run idempotent (re-running the same day duplicates nothing).
- [X] T024 [US2] Update `netlify/functions/tasas-hipoteca.js`: compute `frescura` with `calcularFrescura(publicado_en, now)` and `proximaActualizacion` with `proximaActualizacion(now)`; when never published return `frescura: "sin_datos"`, `terminos: null`, `publicadoEn: null`; keep the `activo=false` and 503 paths from US1.
- [X] T025 [US2] Update `tasas-hipoteca.js` (root): render the "Revisado" and "Próxima revisión" lines, the status pill (`Al día` / `Sin actualizar` / `Aún sin datos`), the visible "No pudimos actualizar…" notice for `sin_actualizar` (figures and their original dates stay), and the empty state for `sin_datos` (no numbers at all); if the fetch itself fails, keep whatever was rendered and show the honest "no disponible ahora" message; the rest of the page must be unaffected (FR-022).
- [X] T026 [US2] Run `node --test tests/`; all suites must pass.

**Checkpoint**: US1 + US2 work together; the schedule and honesty rules are in place.

---

## Phase 5: User Story 3 — Be told when something important changes (Priority: P1)

**Goal**: the daily watch also reads the Treasury 10-year yield and the NY Fed target range; when a Freddie Mac weekly move, a Treasury 10-year move, or a Fed target-rate change reaches the rule, an alert appears on Comprar casa and a dismissible banner appears on the other public pages, worded only as "what changed".

**Independent Test**: feed fixtures (or set `tasas_config.umbral_pp` very low and use "Run now") on a non-Monday/Tuesday and confirm the alert on `comprar-casa.html#tasas` and the banner on `index.html`, `herramientas.html`, `credito.html`; changes below the threshold raise nothing; dismissing the banner keeps it hidden until a *new* alert; no banner on `login`, `cuenta`, `admin`, `privacidad`, `terminos`.

### Tests for User Story 3

- [X] T027 [P] [US3] Create fixtures in `tests/fixtures/tasas/`: `tesoro-ok.xml` (Atom entries with `NEW_DATE` and `BC_10YEAR`, at least 6 business days including the date of the last PMMS row in `pmms-ok.csv`), `tesoro-sin-base.xml` (no entry for the PMMS date, but an earlier business day exists), `tesoro-base-mes-anterior.xml` (entries for the last days of one month and the first days of the next, to test a baseline that falls in the previous month), `tesoro-malformado.xml`, `nyfed-sin-cambio.json`, `nyfed-cambio.json` (`targetRateTo` differs from the stored value) and `nyfed-malformado.json`, each shaped like the real feeds in [contracts/source-feeds.md](./contracts/source-feeds.md).
- [X] T028 [P] [US3] Extend `tests/tasas-hipoteca-logica.test.js` with the alert rules: threshold boundary (`0.12` → no alert, `0.125` → alert; a different `umbral_pp` changes the outcome); weekly move raises one alert per term with the right direction and size; Treasury alert compares the current 10-year value with its value on the last PMMS date (or the closest earlier business day) and sets `semanalPendiente: true`; Treasury hysteresis (clears when `|Δ| ≤ T/2` or when the baseline changes); **dedupe**: the same `clave` (`tipo:termino:direccion:baseline_id:floor(|Δ|/T)`) never raises twice, and a closed clave never reopens; a publish run marks active alerts `superada`; a signal alert never changes `terminos`; Fed: a change of `targetRateTo` raises `fed_objetivo` with `datos.desde/hasta`, a **hold raises nothing**, the very first run stores the value and raises nothing; parsers return an error object for the malformed fixtures and no alert results from a failed source; Treasury outside `[0,15]` and Fed outside `[0,20]` are held; `mesesATraer(ahora, fechaBase)` returns the current month, and also the previous month when `fechaBase` falls in it (run 2026-05-04 with base 2026-04-30 → `["202605","202604"]`; run 2026-05-12 with base 2026-05-07 → `["202605"]`); a baseline missing from every fetched month raises **no** alert and is logged as `tesoro-10a: "sin base"`.
- [X] T029 [P] [US3] Extend `tests/tasas-texto.test.js`: `textoAlerta` and `textoBanner` for all three kinds contain the term/direction/size/date/source; Treasury and Fed texts say the weekly Freddie Mac average has not been republished yet; the Fed text says mortgage rates are not set directly by the Fed; Fed hold has no text (no alert exists); loop over every generated string (all kinds, both directions, both terms) asserting no forbidden word (SC-006); banner text is a single line (no newline) and under 160 characters.
- [X] T030 [P] [US3] Extend `tests/tasas-paginas.test.js`: the two script tags are present in exactly these 12 pages — `index`, `herramientas`, `credito`, `comprar-auto`, `cartas-claras`, `contrato-auto`, `agendar`, `contacto`, `aparezco`, `formar-negocio`, `listar-negocio`, `quienes-somos` — and absent from `login`, `cuenta`, `admin`, `privacidad`, `terminos` (SC-003b); each script tag comes after `nav.js` and before `analytics.js`; the banner code contains the localStorage key `themora_tasas_aviso_cerrado` inside `try`/`catch`; `styles.css` defines the banner class; `tasas-hipoteca.js` declares `const TASAS_LANZADO` and checks it before any `fetch(` (so while it is `false` no request is made).

### Implementation for User Story 3

- [X] T031 [US3] In `netlify/functions/tasas-hipoteca-logica.js` implement and export `parseTesoro(xmlText)` (extract `NEW_DATE` and `BC_10YEAR` from each entry with a small regex/string parser, no library), `parseNyFed(jsonText)` (`refRates[]` → latest `effectiveDate`, `targetRateFrom`, `targetRateTo`), `claveAlerta(...)`, `evaluarAlertas({ umbral, pmms, tesoro, fed, alertasActivas, tipoCorrida })` returning `{ nuevas, superadas, despejadas }`, `prioridadBanner(alertas)` (`fed_objetivo` > `movimiento_semanal` 30 > 15 > `tesoro_10a`), and `mesesATraer(ahora, fechaBasePmms)` (list of `YYYYMM` strings for the Treasury feed: the current month, plus the previous month whenever the PMMS baseline date falls in it), exactly as T028 describes and per research R7 and data-model (alert states `activa` → `superada` | `despejada`).
- [X] T032 [P] [US3] In `tasas-texto.js` implement `textoAlerta(alerta)` and `textoBanner(alerta)` for `movimiento_semanal`, `tesoro_10a` and `fed_objetivo` using the example shapes in contracts/ui-block-and-banner.md §3 (facts only; the "todavía no se ha vuelto a publicar" sentence when `semanalPendiente`; the "no las fija directamente la Reserva Federal" sentence for the Fed).
- [X] T033 [US3] Update `netlify/functions/tasas-agente.js`: fetch the three feeds **in parallel** with `Promise.allSettled` (8-second timeout each; Treasury URL for each month returned by `mesesATraer` — the current month, plus the previous one when the PMMS baseline date falls in it; NY Fed `…/effr/last/2.json`); store Treasury (`dgs10`) and Fed (`fed_hasta`, `fed_desde`) readings in `tasas_lecturas` on every run; read `tasas_config.umbral_pp` at the start of each run; call `evaluarAlertas`, insert new rows into `tasas_alertas` (`on_conflict=clave` do nothing), update `estado`/`cerrada_en` for superseded and cleared ones (publish runs supersede all active alerts before re-evaluating); set `alerta_nueva` in the run log; a failed source produces no reading and no alert.
- [X] T034 [US3] Update `netlify/functions/tasas-hipoteca.js`: return `alertas` (active rows only, ordered by `prioridadBanner`, only the public fields in the contract: `id, tipo, termino, direccion, magnitudPp, detectadaEn, fechaFuente, fuente{id,nombre,url}, semanalPendiente, datos`) and `fuentesSenal` from the catalog.
- [X] T035 [US3] Update `tasas-hipoteca.js` (root): (a) in the block render one alert card per active alert using `textoAlerta`; (b) on pages **without** `#tasas`, insert one in-flow `<div class="tasas-aviso" role="status">` as the first child of `<body>` with `textoBanner(first alert)`, a "Ver detalle" link to `comprar-casa.html#tasas` and a close button (`aria-label="Cerrar aviso"`); dismissal stores the alert id under `themora_tasas_aviso_cerrado` in `localStorage` inside `try`/`catch` (if storage throws, the banner still works); the banner shows only when `activo`, at least one alert exists and that id was not dismissed; any failure renders nothing and throws nothing; (c) call `window.ThemoraStats.evento` (guarded) with only `tasas-bloque-visto`, `tasas-alerta-vista` (prop `tipo` = alert kind only), `tasas-aviso-visto`, `tasas-aviso-cerrado`, `tasas-aviso-enlace` — never values, dates, ids or free text.
- [X] T036 [P] [US3] Add the banner styles to `styles.css`: class `.tasas-aviso` (in flow, not fixed/sticky; one line plus link plus close button at 360 px; readable contrast; text not colour-only) using the site's existing CSS variables; it must not cover the header, navigation or any form (FR-028).
- [X] T037 [US3] Add `<script src="tasas-texto.js" defer></script>` and `<script src="tasas-hipoteca.js" defer></script>` to the 12 pages listed in T030, after the `nav.js` tag and before the `analytics.js` tag; do **not** add them to `login`, `cuenta`, `admin`, `privacidad`, `terminos`.
<!-- T038 intentionally unused: the privacy line moved to the launch commit (T057) so the site does not mention the feature before setup is done. IDs are not renumbered. -->
- [X] T039 [US3] Run `node --test tests/`; all suites must pass. Then `git diff --stat` on every edited page (LF check).

**Checkpoint**: alerts and banner work; combined with US1 and US2 the full P1 scope of the request is delivered.

---

## Phase 6: User Story 4 — Understand where the numbers come from (Priority: P2)

**Goal**: the block shows, for each source, what it measures, how often it publishes and a link; each figure names its source; the headline is never blended with the signals.

**Independent Test**: open the sources area of `#tasas`: three sources with name, one plain-Spanish "what it measures" line, publishing rhythm and a working link; the headline figures name Freddie Mac only.

- [X] T040 [P] [US4] Extend `tests/tasas-texto.test.js` and `tests/tasas-hipoteca-logica.test.js`: every source in the catalog has non-empty `nombre`, `mide`, `frecuencia`, an `https://` `url` and `atribucion`; the catalog has exactly the ids `freddie-pmms`, `tesoro-10a`, `nyfed-objetivo` (so adding MND or MBA is a deliberate, test-visible change); only `freddie-pmms` has `rol` `titular` and `mostrar_cifras` true; `construirSnapshotTitular` output contains no `tesoro`/`fed` keys; `textoFuentes(...)` output has one entry per source and no forbidden word.
- [X] T041 [P] [US4] In `netlify/functions/tasas-hipoteca-logica.js` fill the catalog `mide` lines in plain Spanish: Freddie Mac — "Promedio nacional semanal de las tasas que ofrecen los prestamistas, para hipotecas fijas a 30 y 15 años"; Tesoro — "Rendimiento diario del bono del Tesoro a 10 años, una referencia que las tasas hipotecarias suelen seguir"; NY Fed — "Rango objetivo de la tasa de fondos federales que fija la Reserva Federal". Add `textoFuentes(catalogo)` to `tasas-texto.js`.
- [X] T042 [US4] Update `tasas-hipoteca.js` (root) and the `#tasas` markup in `comprar-casa.html`: render the sources area in `.rate-delivery` / `.rate-source-links` from `fuente` + `fuentesSenal`, each link with `target="_blank" rel="noopener noreferrer"` and `data-umami-event="tasas-fuente-abierta"`; add a fixed sentence that the headline comes from one source and the other two are only signals that can raise an alert (FR-017, FR-029).
- [X] T043 [US4] Run `node --test tests/`; all suites must pass.

**Checkpoint**: sources are transparent; US4 is independent of US5.

---

## Phase 7: User Story 5 — The owner can tell the agent is healthy (Priority: P3)

**Goal**: an owner-only section of the admin panel shows the last runs, which sources answered, the age of the last success, held readings, active alerts and any missed day; nothing is sent to the owner.

**Independent Test**: as an admin, open the admin panel → "Agente de tasas": rows for the last runs with per-source results and the last 14 expected days; as a non-admin or with no token the function returns 403/401 and no data.

- [X] T044 [P] [US5] Create `tests/tasas-admin.test.js`: calling the `tasas-admin` handler with **no** `Authorization` header returns `401` with no data; `diasEsperados(ultimas14, corridas)` marks a day with no run as `hubo: false` and labels Monday/Tuesday `esperada: "publicacion"` and other days `"vigilancia"`; `horasDesdeUltimaOk` counts from the last run whose `resultado` is `ok` or `parcial`; `sanearErrorFuente(text)` returns only one of `timeout`, `http NNN`, `formato inesperado` (never a URL, key or stack trace).
- [X] T045 [P] [US5] In `netlify/functions/tasas-hipoteca-logica.js` implement and export `diasEsperados`, `horasDesdeUltimaOk`, `sanearErrorFuente`; use `sanearErrorFuente` in `tasas-agente.js` when writing `tasas_corridas.fuentes`.
- [X] T046 [US5] Create `netlify/functions/tasas-admin.js` per [contracts/status-admin.md](./contracts/status-admin.md): copy the `verifyCaller` pattern from `netlify/functions/admin-data.js` (session check via `/auth/v1/user` with the anon key), require `app_metadata.is_admin === true` (401 without/invalid token, 403 when not admin, no data in either case), then read `tasas_config`, `tasas_publicado`, the last 60 rows of `tasas_corridas`, held readings (`estado = 'retenida'`) and active alerts with the service key; return the contract shape with `Cache-Control: no-store`; GET only; no email or any outbound message (FR-031).
- [X] T047 [US5] Edit `admin.html`: inside `#adminContent` add an "Agente de tasas" section (Spanish) using the panel's existing `admin-table` styles: freshness and hours since last OK run, launch switch state, threshold, last runs table (day, type, result, sources), held readings, active alerts, and the last 14 expected days with a visible mark for a missed day; load it with the same access token the panel already holds; on error show a short message and a retry, without breaking the rest of the panel.
- [X] T048 [US5] Run `node --test tests/`; all suites must pass.

**Checkpoint**: all five stories are implemented.

---

## Phase 8: Polish & cross-cutting concerns

- [X] T049 [P] Create `INSTRUCCIONES-TASAS.md` (Spanish, plain, verifiable steps, same tone as the other `INSTRUCCIONES-*.md`): what the agent does and its schedule in UTC (13:00 UTC = 9 am EDT / 8 am EST, runs only on the production deploy); (1) run the new SQL from `supabase-schema.sql` in Supabase and confirm the five `tasas_*` tables exist; (2) confirm the three env vars in Netlify; (3) deploy, then Netlify → Functions → `tasas-agente` → **Run now**, and check the owner view; (4) how to test a publish run on a non-Monday/Tuesday with `TASAS_FORZAR_TIPO=publicacion` and remove it afterwards; (5) how to test an alert by lowering `tasas_config.umbral_pp` (e.g. `0.01`) and restoring `0.125`; (6) how to release a held reading (`estado = 'verificada'`) and how to insert a safe test reading; (7) how to break one source safely on a preview deploy to see the "No pudimos actualizar" notice; (8) **only when all of the above works**, do the launch commit (T057–T059: the privacy line, the search entry and `TASAS_LANZADO = true`), deploy, and then set `tasas_config.activo = true`; (9) the source list, the licence notes (Freddie Mac: attribution required, no alteration) and why MND and MBA are not used; (10) how to add a page to or remove it from the banner list. State that the site says nothing about the feature until step 8.
<!-- T050 intentionally unused: the search-index entry moved to the launch commit (T058). IDs are not renumbered. -->
- [X] T051 Run the full `node --test tests/` and report the exact result; fix code (never tests) until green.
- [X] T052 Run `git diff --stat` across all changed and new files and confirm no whole-file line-ending rewrite; fix any file that flipped to CRLF.
- [X] T053 Run `graphify update .` (constitution: Grafo de conocimiento).
- [ ] T054 Manually verify [quickstart.md](./quickstart.md) section A (automated) and, using a local static server or the browser file view with a stubbed snapshot, the page states at 360 px and 1280 px: pre-launch (`TASAS_LANZADO` false: nothing rendered and **no request** in the network tab), hidden (`activo` false), empty, normal, stale, alert card, banner and dismissal, and a post-launch outage (block visible with the honest "no disponible ahora" message, no banner) — to render anything, set `TASAS_LANZADO = true` only in a local, **uncommitted** copy and revert it afterwards (the T011 guard test fails if it is committed without T057 and T058); confirm no horizontal scroll and no console error that stops other scripts.

### Owner actions (not part of the implementation tasks; do not perform until the owner says so)

- [ ] T055 Owner: approve the source list and the omission of Mortgage News Daily and MBA (**G-SRC**), and confirm or edit the 12-page banner list and the wording.
- [ ] T056 Owner: run the SQL in Supabase, deploy (the site still shows nothing: `TASAS_LANZADO` is `false`), use **Run now**, and follow `INSTRUCCIONES-TASAS.md` up to its "listo para lanzar" step (**G-SETUP**).

### Launch commit (one commit; perform only after the owner approves T055 and completes T056; in this order)

- [ ] T057 Edit `privacidad.html`: add one short Spanish line in the section that describes what the site remembers in the browser: if you close the mortgage-rate notice, the site remembers it **only in your own browser**, sends nothing and uses no cookies. Do not invent a new section or table. (**G-PRIV**; formerly T038)
- [ ] T058 Edit `site-search-index.js`: add one entry for the block (title "Tasas hipotecarias de referencia (15 y 30 años)", url `comprar-casa.html#tasas`, keywords such as `tasa de hipoteca`, `tasas 30 años`, `tasas 15 años`, `tasa hoy`, `Freddie Mac`), following the format of the existing entries. (formerly T050)
- [ ] T059 In `tasas-hipoteca.js` (repo root) change `const TASAS_LANZADO = false;` to `true`. Deploy, then set `tasas_config.activo = true`, then run the four-week trial in quickstart section C.

---

## Dependencies & execution order

- **Phase 1 → Phase 2 → stories.** Phase 2 blocks everything.
- **US1** (Phase 3) has no story dependency: it is the MVP.
- **US2** depends on US1 (extends the agent, the public function and the block).
- **US3** depends on US2 (alerts are superseded at *publication* runs and need `tipoDeCorrida`).
- **US4** depends on US1 only; **US5** depends on US2 (needs the run log). US4 and US5 can proceed in parallel after US2.
- **Phase 8** after the stories you decide to ship.

```text
Setup → Foundational → US1 → US2 → US3
                         └────────→ US4   (after US1)
                              └───→ US5   (after US2)
```

### Same-file ordering (not parallel)

- `supabase-schema.sql`: T003 → T004.
- `netlify/functions/tasas-hipoteca-logica.js`: T006 → T012 → T021 → T031 → T041 → T045.
- `tasas-texto.js`: T007 → T013 → T022 → T032 → T041.
- `netlify/functions/tasas-agente.js`: T014 → T023 → T033 → (T045 edit).
- `netlify/functions/tasas-hipoteca.js`: T015 → T024 → T034.
- `tasas-hipoteca.js` (root): T016 → T025 → T035 → T042 → T059 (launch commit).
- `comprar-casa.html`: T017 → T042.
- Test files: `tasas-hipoteca-logica.test.js` T009 → T019 → T028 → T040; `tasas-texto.test.js` T010 → T020 → T029 → T040; `tasas-paginas.test.js` T011 → T030.

### Parallel opportunities

- Phase 2: T005 ∥ T007 ∥ T003–T004 (different files); T006 is alone in its file.
- US1 tests: T008 ∥ T009 ∥ T010 ∥ T011; implementation T013 ∥ T012.
- US2 tests: T019 ∥ T020; T022 ∥ T021.
- US3 tests: T027 ∥ T028 ∥ T029 ∥ T030; T032 ∥ T036.
- US4 ∥ US5 after US2 (different files: `tasas-texto.js`/`comprar-casa.html` vs `tasas-admin.js`/`admin.html`).
- Polish: T049 (T050 is unused; its work moved to T058 in the launch commit).

## Implementation strategy

- **MVP first (US1)**: tables + one manual "Run now" + the block behind the switch. Stop and validate with quickstart steps 1–4.
- **Then US2 and US3** (both P1): together they are what the request asks for — Monday/Tuesday refresh with honest freshness, and important-change alerts on the block and site-wide.
- **Then US4 (P2) and US5 (P3)** as time allows; both are independent of each other.
- **Ship nothing publicly** until the owner approves T055, completes T056 and the launch commit (T057–T059) is made; the two launch switches (`TASAS_LANZADO` in the browser script and `tasas_config.activo` in the database) keep the whole feature invisible until then.
