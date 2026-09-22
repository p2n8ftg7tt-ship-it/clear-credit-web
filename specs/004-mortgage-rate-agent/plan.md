# Implementation Plan: Mortgage Rate Watch Agent (Buy-a-House page)

**Branch**: `004-mortgage-rate-agent` (no git branch created) | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-mortgage-rate-agent/spec.md` (with the five clarifications of 2026-09-21)

## Summary

A scheduled agent watches U.S. mortgage-rate sources **every day**, publishes the 15- and 30-year reference rates **on Mondays and Tuesdays**, and raises an **alert on the Comprar casa page plus a dismissible banner on the site's other public pages** when something important changes (a ≥ 0.125-point move, or a Federal Reserve target-rate change).

Approach (details and evidence in [research.md](./research.md)):

- **One Netlify Scheduled Function**, `tasas-agente`, runs daily at 13:00 UTC. Mon/Tue it publishes and evaluates alerts; other days it only watches. It reads three public feeds: **Freddie Mac PMMS** (headline, both terms, weekly), **U.S. Treasury 10-year yield** (daily signal) and **NY Fed target range** (Fed decisions). Mortgage News Daily and MBA are **not used** in v1 because their terms could not be verified.
- **Supabase** stores readings, the published snapshot, alerts, run logs and a config row (threshold + launch switch), written only by the function with the service-role key.
- A **public read-only function** `tasas-hipoteca` serves one sanitized, CDN-cached JSON snapshot; a small owner-only function `tasas-admin` feeds a new section of the admin panel.
- **Front end without a framework**: `tasas-texto.js` (pure wording, tested in Node) and `tasas-hipoteca.js` (renders the block from the already-present but unused `.rate-watch-*` styles, and the banner elsewhere).
- The feature is **invisible until launch** (constitution: no mention before setup is done): the browser script ships with `const TASAS_LANZADO = false` and makes no request; the privacy line and the search entry are added only in the launch commit; and the database row `tasas_config.activo` stays false until the owner has followed a new `INSTRUCCIONES-TASAS.md`. After launch, `activo = false` remains the owner's off switch, and an unreachable snapshot shows an honest "no disponible ahora" message instead of a blank spot.

**Important finding for the owner**: Freddie Mac publishes once a week (Thursday), so Monday's and Tuesday's headline figures will normally be identical; the page therefore always shows the survey's own publication date next to the "checked" date (FR-030). See research R2.

## Technical Context

**Language/Version**: Plain browser JavaScript (ES2017 max, like existing scripts) and Node 18+ CommonJS for Netlify functions and tests. No transpilation.

**Primary Dependencies**: None new. Node's built-in `fetch`/`AbortController`, Supabase REST over `fetch` (same pattern as `admin-data.js`), `node:test`. No XML library: the Treasury feed's two fields are extracted with a small, tested parser.

**Storage**: Supabase (5 new tables, RLS on, no policies): `tasas_config`, `tasas_lecturas`, `tasas_publicado`, `tasas_alertas`, `tasas_corridas` — see [data-model.md](./data-model.md). Browser: one `localStorage` key for banner dismissal (per visitor, no personal data).

**Testing**: `node --test tests/` — new `tests/tasas-hipoteca-logica.test.js`, `tests/tasas-texto.test.js`, `tests/tasas-paginas.test.js`, fixtures in `tests/fixtures/tasas/`. Existing suites must keep passing. I/O shell verified by [quickstart.md](./quickstart.md).

**Target Platform**: Static site on Netlify (`publish = "."`) + Netlify Functions; Scheduled Functions run only on the **production deploy**, UTC cron, 30-second limit. Modern desktop and mobile browsers (360 px and 1280 px tested).

**Project Type**: Static multi-page website + serverless functions (no build step).

**Performance Goals**: Agent run < 10 s typical (three fetches in parallel, 8 s timeout each; hard limit 30 s). Snapshot response served from CDN cache; block/banner render without blocking page load (`defer`). An alert reaches visitors ≤ 5 minutes after the run that raised it.

**Constraints**: No new external origin in the browser (CSP unchanged: same-origin function only); server-side fetches are to three public hosts; no secrets in the repo; every failure degrades to an honest message or nothing (never a broken page); LF line endings; a manual override env var `TASAS_FORZAR_TIPO` (`publicacion`/`vigilancia`) lets the owner test a publish run on a non-Monday/Tuesday, removed after testing (documented in the instructions).

**Scale/Scope**: 1 scheduled function, 2 small HTTP functions, 1 pure logic module, 2 browser files, 1 new `admin.html` section, 13 pages get one `<script>` tag, `comprar-casa.html` gets one section, 5 tables, ~1 run/day (≈365 run rows/year), 3 test files, 1 instructions file, `netlify.toml`, `privacidad.html` and `supabase-schema.sql` edits.

## Constitution Check

*GATE: must pass before Phase 0. Re-checked after Phase 1 design — see bottom.*

| Principle / rule | Assessment | Status |
|---|---|---|
| **I. Honestidad y no asesoría (NON-NEGOTIABLE)** | Every figure carries a named source and reads as a national reference average, not an offer (FR-003). All alert/banner text is generated by one module and states only what changed; a forbidden-word test blocks advice and prediction (SC-006). Treasury and Fed alerts say the weekly average is not yet republished; Fed alerts say the Fed does not set mortgage rates directly (FR-029, FR-032). Freddie Mac's "no alteration" term is honored: values shown unaltered, the computed change labeled as ours. Sources whose terms are unverified are not used (FR-018). Nothing is estimated when a source fails (FR-008). | PASS |
| **II. Privacidad por diseño** | No visitor data is collected or sent: the block/banner only read a public snapshot; dismissal lives in the visitor's own browser. Analytics events are categorical only (FR-021). No third party is contacted from the browser. **At launch (not before)**, `privacidad.html` gets one line about the dismissal memory. | PASS (privacy line = launch task T057) |
| **III. Funciona sin IA** | No AI anywhere in this feature. Every failure path (source down, function down, storage blocked, no data yet) degrades to the last verified figures with an honest notice, or to nothing (banner), and never blocks the rest of the page. | PASS |
| **IV. Una sola verdad, probada** | Figures live in one place (the published snapshot row) and are shown, not re-typed; wording lives in one module; the illustrative comparator rates stay labeled as examples and are never presented as the agent's figure. Pure logic (parsing, thresholds, dedupe, hysteresis, freshness, Fed hold/change, banner pages, wording) ships with `node --test` coverage before publishing. Only the Spanish text exists in v1, so there is no cross-language mismatch to test. | PASS |
| **V. Multilingüe con revisión humana** | Spanish-first; fixed strings collected in one object so other languages can be added; any AI-written translation added later must be marked `TODO(NATIVE_REVIEW)`. v1 ships Spanish only, contradicting nothing. | PASS |
| **Static site, no build; functions for server logic** | Uses plain files and Netlify functions; no framework, no package. The scheduled function is the first of its kind in the project — see Complexity Tracking. | PASS |
| **Everything at the root is published → block internal files** | New `INSTRUCCIONES-TASAS.md` MUST get a 404 rule in `netlify.toml`, like the other instruction files. Fixtures live under the already-blocked `tests/`. | PASS (task G-BLOCK) |
| **Secrets outside the code** | Only existing env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); no upstream feed needs a key. | PASS |
| **Session check + rate limit on functions that spend money or touch data** | `tasas-admin` verifies session + `is_admin`. `tasas-agente` has no URL (cannot be invoked by the public). `tasas-hipoteca` is public by design — see Complexity Tracking. | JUSTIFIED |
| **Browser security headers / CSP** | Browser talks only to its own origin; CSP unchanged. Test asserts `netlify.toml` CSP is untouched. | PASS |
| **File format LF** | New/edited files keep LF; check `git diff --stat`. | PASS (verify) |
| **Docs beside the change** | `INSTRUCCIONES-TASAS.md` (Spanish, verifiable steps: create tables, confirm env vars, first "Run now", the launch commit (T057–T059), flip `activo`, how to release a held reading, how to change the threshold, how to test). The site says nothing until `activo = true`. | PASS |
| **Graph** | Run `graphify update .` after code changes. | TODO at implementation |

**Gate result**: PASS to proceed, with these gates to close before publishing: **G-SETUP** (instructions written and followed; feature still `activo = false` until then), **G-BLOCK** (404 rule for the new instructions file), **G-PRIV** (privacy line, added in the launch commit and never before), **G-TESTS** (`node --test tests/` green), **G-SRC** (owner approves the source list and the omission of MND/MBA).

## Project Structure

### Documentation (this feature)

```text
specs/004-mortgage-rate-agent/
├── plan.md                          # This file
├── research.md                      # Phase 0 (sources, cadence, hosting, rules)
├── data-model.md                    # Phase 1 (tables, states)
├── quickstart.md                    # Phase 1 (validation guide)
├── contracts/
│   ├── snapshot-public.md           # GET /.netlify/functions/tasas-hipoteca
│   ├── status-admin.md              # GET /.netlify/functions/tasas-admin (owner only)
│   ├── source-feeds.md              # upstream feeds the agent reads
│   └── ui-block-and-banner.md       # on-page block, banner, wording rules, analytics
├── checklists/requirements.md       # from /speckit-specify
└── tasks.md                         # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
netlify/functions/
├── tasas-hipoteca-logica.js   # NEW  pure: source catalog, parsers, plausibility, alert rules, freshness, next refresh
├── tasas-agente.js            # NEW  scheduled: fetch feeds → pure rules → Supabase REST writes → run log
├── tasas-hipoteca.js          # NEW  public read-only snapshot (CDN-cached)
└── tasas-admin.js             # NEW  owner-only status (session + is_admin)

tasas-texto.js                 # NEW  browser+Node: fixed strings, number formatting, alert/banner text
tasas-hipoteca.js              # NEW  browser: renders #tasas block; injects banner; dismissal; analytics; TASAS_LANZADO launch constant
comprar-casa.html              # EDIT add <section id="tasas" hidden> using existing .rate-watch-* styles + 2 script tags
{index,herramientas,credito,comprar-auto,cartas-claras,contrato-auto,agendar,contacto,aparezco,formar-negocio,listar-negocio,quienes-somos}.html
                               # EDIT one <script src="tasas-texto.js"> + <script src="tasas-hipoteca.js"> each (banner list)
admin.html                     # EDIT "Agente de tasas" owner section
privacidad.html                # EDIT at launch only (T057): one line about the banner-dismissal memory
supabase-schema.sql            # EDIT append the 5 tables (RLS on, no policies)
netlify.toml                   # EDIT [functions."tasas-agente"] schedule; 404 rule for INSTRUCCIONES-TASAS.md
site-search-index.js           # EDIT at launch only (T058): one entry for the block
INSTRUCCIONES-TASAS.md         # NEW  Spanish setup/operation guide (blocked in netlify.toml)

tests/
├── tasas-hipoteca-logica.test.js
├── tasas-texto.test.js
├── tasas-paginas.test.js
└── fixtures/tasas/            # PMMS csv, Treasury xml, NY Fed json samples (good + malformed)
```

**Structure Decision**: extend the existing static-site-plus-functions layout; no new folder at the root and no new dependency. Server-only logic stays inside `netlify/functions/` (no cross-directory requires, following `leyes-digest.js`); browser+Node wording lives at the root like `zyron-leyes.js` so tests can import it. The banner script is added to the 12 agreed pages by hand (there is no shared layout include in this static site); a test pins that list.

## Complexity Tracking

| Deviation / risk | Why needed | Simpler alternative rejected because |
|---|---|---|
| **Sources left out of v1** (spec FR-015 amended to match): the daily mortgage-rate index (MND) and MBA application data are not used | Their terms could not be verified as allowing this use (MND terms not visible; MBA returned 403); FR-018 requires not showing such figures | Scraping them "just in case" would risk breaching terms. Owner approval needed (**G-SRC**); adding them later needs written permission or a licensed feed |
| **Public function without session or per-IP limit** (`tasas-hipoteca`) | FR-022: visitors must not sign in; the response is identical for everyone, read-only, contains no personal data and costs nothing per call | A session check would hide the block from most visitors; per-IP limits add state for no benefit. Mitigation: CDN `s-maxage=300`, no query parameters, tiny sanitized payload, failure returns a static "no disponible" |
| **First Scheduled Function in the project** (no precedent) | The user asked for an agent that runs on a schedule; it must run without the owner's computer | The owner's-PC task used for the car agent needs the PC on and manual publishing; GitHub Actions adds a second system. Risk: Netlify runs schedules only on production deploys and in UTC (13:00 UTC = 9 am EDT / 8 am EST) — documented in the instructions |
| **Five tables** | Config, readings, snapshot, alerts and runs have different lifecycles and audiences (owner vs public) | One JSON blob would mix audit history with public data and make dedupe/hysteresis untestable. Sources are code, not a table, to keep it small |
| **`verifyCaller` duplicated a third time** in `tasas-admin.js` | Same pattern as `coach.js` and `admin-data.js`; keeps each function self-contained (no shared lib in this repo) | Extracting a shared helper touches unrelated functions; out of scope |
| **Alert on Freddie's Thursday figure appears Friday, headline changes Monday** | Spec keeps headline updates to Mon/Tue (FR-006, FR-029) while alerts may appear any day | Publishing the headline on Friday would break the user's Monday/Tuesday rule; the alert carries its own dated figures so nothing is inconsistent. One-line schedule change if the owner later wants a Friday refresh |

## Post-design constitution re-check

Design (data model, four contracts, quickstart) keeps every gate: honesty rules are enforced in one tested wording module (I); the browser handles no personal or financial data and analytics carries no values (II); every failure has a no-AI, no-dependency fallback (III); one snapshot row is the single source of figures, sources are one catalog, tests cover logic, wording and page coverage (IV); Spanish only in v1 with a slot for reviewed translations (V). No new violation was introduced; the items in Complexity Tracking are justified above, and **G-SRC** (source list and MND/MBA omission) needs the owner's approval before launch.
