# Research: Mortgage Rate Watch Agent

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-21

Every unknown from the plan's Technical Context is resolved here. Source facts were checked on 2026-09-21 by fetching the live pages; the values quoted are only to show the *shape* of each feed (they are not copied into the site).

## R1. Which source is the headline, and can we display it?

- **Decision**: Freddie Mac **Primary Mortgage Market Survey (PMMS)** is the headline for both terms, read from Freddie Mac's own history file (`https://www.freddiemac.com/pmms/docs/PMMS_history.csv`, columns `date, pmms30, …, pmms15, …`, dates as `M/D/YYYY`, newest row last).
- **Evidence**: The PMMS page says the survey publishes "each Thursday at noon ET" (Wednesday when Thursday is a holiday) and that "information from this document may be used with proper attribution. Alteration of this document or its content is strictly prohibited." The CSV was fetched and parsed: latest rows were 9/10/2026 (6.76 / 6.09) and 9/17/2026 (6.95 / 6.26).
- **Consequence for design**: show Freddie's numbers **unaltered**, name and link Freddie Mac on every figure, and label the "change" as Themora's own subtraction (not a Freddie figure). Never round, blend or re-label the value itself.
- **Alternatives considered**: FRED series `MORTGAGE30US` / `MORTGAGE15US` (same numbers, keyless CSV works, but adds a second copyright notice and a middleman) → rejected as primary; kept as a possible fallback in a later version. Scraping the PMMS HTML → rejected (fragile, no advantage over the CSV).

## R2. The cadence reality (important for the user)

- **Finding**: PMMS changes **once a week (Thursday)**. A Monday reading and a Tuesday reading will therefore show the **same** 15/30-year figures unless a holiday shifts the release. What changes between Monday and Tuesday is the *supporting* data (Treasury yield, Fed target) and the "checked on" time.
- **Decision**: keep the user's schedule (publish Monday and Tuesday) exactly as specified, and make the page honest about it: it always shows the **date the survey was published** (FR-030) next to the **date it was checked**. The daily watch (every day, including Thursday evening's release the next morning) is what makes a Thursday move visible before Monday.
- **Open question for the owner** (not blocking): if a same-week, mid-week refresh of the *headline* is wanted (e.g. Friday), that is a one-line schedule change; the spec deliberately limits headline updates to Monday/Tuesday.

## R3. Which "supporting signals" are usable? (FR-015 vs FR-018)

| Candidate | What it gives | Verified access / terms | Decision |
|---|---|---|---|
| **10-year U.S. Treasury yield** (Treasury Dept. daily par yield curve) | Daily benchmark mortgage rates track | Public domain (`.gov`); Atom/XML feed with `NEW_DATE` and `BC_10YEAR` fields, plus CSV | **Use** as the daily signal |
| **Federal Reserve target range** via NY Fed reference-rate JSON (`https://markets.newyorkfed.org/api/rates/unsecured/effr/last/2.json`) | `targetRateFrom` / `targetRateTo` per date | Public JSON, `.org` of the NY Fed; fields verified | **Use** to detect target-rate *changes* (Fed decision cuts/hikes) |
| Fed FOMC press-release RSS (`federalreserve.gov/feeds/press_monetary.xml`) | Titles and dates of statements; **no rate values in the feed** | Public | **Use only as the link** shown in a Fed alert ("Ver el comunicado"), not for values |
| FRED `DFEDTARU/DFEDTARL` | Target range | The copy fetched ended at 2021-12-31 | **Rejected** (looks stale/unreliable) |
| **Mortgage News Daily** daily index | Daily 30/15-year index | Page shows © notice; terms text not visible to the check; commercial site | **Not used in v1** (FR-018: terms unverified) |
| **MBA weekly applications survey** | Application volume | Site returned **HTTP 403** to the check; MBA data is typically licensed | **Not used in v1** (FR-018) |

- **Decision recorded** (spec FR-015 amended to match, 2026-09-21): the daily mortgage-rate index and the weekly application data are candidates, not v1 sources. Their terms could not be verified as permitting use, so v1 omits both, which FR-018 allows. The plan's Complexity Tracking keeps the owner's approval gate (G-SRC); adding either later needs written permission or a licensed feed.
- **What "10-year moved" means in wording**: an alert from this source says the Treasury yield rose/fell and that the weekly Freddie Mac average has **not yet been republished** (FR-029). It never says mortgage rates rose or will rise.

## R4. Where does the agent run?

- **Decision**: a **Netlify Scheduled Function** (`netlify/functions/tasas-agente.js`), declared in `netlify.toml` (`[functions."tasas-agente"] schedule = "0 13 * * *"`, UTC).
- **Evidence** (Netlify docs, fetched today): cron syntax is standard, **UTC only**; **30-second execution limit**; runs **only on published (production) deploys**; no URL invocation (so the public cannot trigger it); can be run manually with "Run now" in the Netlify UI.
- **Fit**: matches the constitution (server logic in Netlify functions, no build step, no new dependency, secrets in Netlify env). Three small fetches in parallel with an 8-second timeout each fit easily inside 30 s.
- **Time choice**: 13:00 UTC = 9 am ET (8 am in winter). Monday/Tuesday visitors see that day's reading in the morning; Treasury's previous-close yield is already published; and Thursday's noon-ET PMMS release is picked up Friday morning (within SC-003's "by the end of the following day").
- **One daily job, two behaviors**: on **Mon/Tue** it *publishes* (copies the latest verified readings into the published snapshot) and evaluates alerts; on other days it only *watches* (records signals, may raise an alert). Same code path, chosen by weekday. Weekend runs are cheap no-ops that still log a run.
- **Alternatives considered**: (a) the owner's-computer scheduled task used for the car agent → rejected: needs the PC on and pushes commits by hand; (b) GitHub Actions cron that commits a JSON file → rejected: adds a second system and a redeploy per change; (c) Netlify Background Functions → unnecessary for a <30 s job.

## R5. Where is the data stored and how do pages read it?

- **Decision**: Supabase tables (already the project's data store), written **only** by the scheduled function with the service-role key (same key format handling as `admin-data.js`). Pages never talk to Supabase for this feature; they read a **public read-only function** `tasas-hipoteca` (same origin), so **CSP is unchanged** (`connect-src 'self'`).
- **Public function behavior**: returns one sanitized JSON snapshot; response is CDN-cacheable (`s-maxage=300`) so page views do not each hit the database; failures return a small `{ "estado": "no_disponible" }` with a 200/503 that the front-end treats as "show nothing / honest message".
- **Alternatives considered**: Netlify Blobs (adds a package dependency and a second store) → rejected; a public Supabase Storage JSON file (no function needed, CDN-backed) → viable and simpler to serve, but it exposes the storage path and splits the logic ("is it fresh?") between agent and browser; rejected for now, easy to switch later.

## R6. How does the site know it is "safe to show"? (Constitution: docs before mention)

- **Decision**: a single row `tasas_config.activo` (default **false**). While false, the public function answers `{ "activo": false }`, the block stays `hidden` and no banner appears — nothing on the site mentions the feature. The owner flips it to true after completing `INSTRUCCIONES-TASAS.md` (tables created, env vars present, a first successful "Run now", wording approved). When true but no reading exists yet, the block shows the honest "todavía no está disponible" message (FR-009). A second, in-code constant `TASAS_LANZADO` (default `false`, in the browser script) keeps the browser from even calling the function before launch, and makes the failure rule unambiguous: **before launch** nothing is requested or rendered; **after launch** an unreachable snapshot shows the honest "no disponible ahora" message in the block (never a blank spot, SC-005) and no banner. The constant is flipped in the launch commit (T059), together with the privacy line (T057) and the search entry (T058), so nothing public mentions the feature earlier.

## R7. Alert rules that are testable and cannot flap

- **Kinds**: `movimiento_semanal` (new PMMS value vs the previous PMMS value, per term, |Δ| ≥ T), `tesoro_10a` (10-year yield now vs its value on the date of the last PMMS reading, |Δ| ≥ T), `fed_objetivo` (target-range upper bound changed vs the last stored value).
- **Threshold `T`**: 0.125 pp (Clarifications, Q2); read from `tasas_config.umbral_pp` on every run (FR-014).
- **Anti-flapping**: (1) each alert has a **dedupe key** = kind + term + direction + baseline reading id + `floor(|Δ|/T)`, so the same condition never raises twice; (2) a Treasury alert **clears** when |Δ| ≤ T/2 (hysteresis) or when the baseline moves (new PMMS reading), (3) alerts are **superseded at the next Monday/Tuesday publish run** (FR-013); a Fed alert lasts until then too.
- **Fed hold ⇒ nothing** (Clarifications, Q5): only a change in `targetRateTo` raises an alert; wording is factual and states that mortgage rates are not set directly by the Fed (FR-032).
- **Implausible values (FR-019)**: PMMS outside 1–15 %, or a week-over-week jump > 1.0 pp, Treasury outside 0–15 %, Fed bound outside 0–20 % ⇒ the reading is stored as `retenida`, not published, and shown in the owner status. Release: the owner sets its `estado` to `publicada` in the table editor (documented in the instructions).

## R8. Freshness ("sin actualizar") rule

- **Decision**: computed server-side in the public function from one pure function: the snapshot is **`al_dia`** if the last successful *publish run* is at or after the most recent scheduled Mon/Tue 13:00 UTC slot (with a 3-hour grace), else **`sin_actualizar`**; **`sin_datos`** if no reading has ever been published. The block then shows the last verified figures with the original dates and a visible "no se pudo actualizar" notice (FR-008).

## R9. Front-end shape

- **Decision**: two new root files, no framework: `tasas-texto.js` (pure wording + number formatting; works in browser and Node so tests can import it, like `zyron-leyes.js`) and `tasas-hipoteca.js` (fetches the snapshot; renders the block on `comprar-casa.html`; injects the banner on the other allowed pages). All alert/banner wording is generated in `tasas-texto.js` from **structured** alert data, so the "no advice / no prediction" rules live and are tested in one place (Constitution IV).
- **Banner pages (default, owner confirms)**: `index`, `herramientas`, `credito`, `comprar-auto`, `cartas-claras`, `contrato-auto`, `agendar`, `contacto`, `aparezco`, `formar-negocio`, `listar-negocio`, `quienes-somos` (plus the block itself on `comprar-casa`). **Excluded**: `login`, `cuenta`, `admin`, `privacidad`, `terminos`. A static test pins this list (SC-003b).
- **Dismissal**: stored in the visitor's own browser (`localStorage`, wrapped in try/catch), keyed by alert id; a new alert id shows the banner again (FR-027). No cookies, no server call.
- **Analytics**: only categorical event names through `window.ThemoraStats.evento`, never values (FR-021).
- **Layout**: the banner is a normal in-flow bar at the top of `<body>` (not fixed/overlaid), one line + link + close button at phone width (FR-028). The block reuses the already-present `.rate-watch-*` styles in `comprar-casa.html`.

## R10. Owner status view

- **Decision**: a new section in `admin.html` (owner-only) fed by a new function `tasas-admin.js` that verifies the caller's Supabase session and `app_metadata.is_admin` exactly like `admin-data.js`. It shows the last N runs (day, type, result, which sources answered/failed), the last successful run age, held readings, and the active alerts. No email/push (Clarifications, Q4; FR-031). The 15-line `verifyCaller` helper is duplicated (the project already duplicates it in `coach.js` and `admin-data.js`); extracting a shared helper is out of scope.

## R11. Testing approach

- `node --test tests/` (existing runner; no dependency). Parsers and rules are pure functions in `netlify/functions/tasas-hipoteca-logica.js`, tested against small fixture files in `tests/fixtures/tasas/` shaped like the real feeds. Wording rules are tested in `tests/tasas-texto.test.js`. A static test pins the banner-page list and checks that no hand-typed "current rate" number was added to the block markup.
- The agent's I/O shell (`tasas-agente.js`) stays thin (fetch → pure functions → REST writes); its behavior is checked by the quickstart (manual "Run now" + reading the status view), not by mocking Netlify.

## R12. Anything else the constitution needs

- **Privacy text**: In the launch commit only (after setup is done, T057), `privacidad.html` gets one line that the site remembers, in the browser only, that a visitor closed the rate banner. No new third party is contacted from the browser.
- **Zyron / other pages (FR-024)**: searched (2026-09-21) `zyron-brain.js`, `zyron-leyes.js`, `credit-coach.js`, `netlify/functions/coach.js`, `leyes-digest.js`, `site-search-index.js` and the calculator scripts for a percentage next to "hipoteca / mortgage / 30 años / 15 años": **no matches**, so no assistant text states a "current" rate. The pages do carry **illustrative default inputs**: comparator 6.5 % / 6.9 % (`comprar-casa.html` `cmpTasaFha`, `cmpTasaConv`), FHA and conventional calculators 6.25 % (`fhaRate`, `convRate`, already labeled "Tasa ilustrativa"), the worked example "Tasa de 6.5 %", and the tools-page mortgage calculator 6.5 % (`herramientas.html`). They stay as they are and stay labeled as examples; the new block must never be described as their source. Zyron quoting the live rate stays out of scope; if added later it must read this same snapshot.
- **Site search**: add one entry to `site-search-index.js` for the new block, in the launch commit only (T058).
