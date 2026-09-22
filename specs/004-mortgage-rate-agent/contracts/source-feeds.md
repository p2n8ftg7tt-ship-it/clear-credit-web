# Contract: upstream source feeds (what the agent reads)

Checked 2026-09-21. The agent fetches each feed with a fixed `User-Agent` naming the site, an 8-second timeout, and no cookies. A feed that fails or changes shape yields `error: …` for that source in the run log; the last verified values stay in place and nothing is guessed (FR-008, FR-019).

| ID | Role | URL | Format | Publishes | Terms / attribution |
|---|---|---|---|---|---|
| `freddie-pmms` | **Headline** (15- and 30-year fixed) | `https://www.freddiemac.com/pmms/docs/PMMS_history.csv` | CSV, header `date,pmms30,pmms30p,pmms15,pmms15p,pmms51,…`; dates `M/D/YYYY`; newest last | Thursdays at noon ET (Wednesday if Thursday is a federal holiday) | "May be used with proper attribution. Alteration … strictly prohibited." → show values unaltered, name + link Freddie Mac PMMS on every figure |
| `tesoro-10a` | Signal (daily benchmark) | `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value_month=YYYYMM` (current month; **plus the previous month whenever the baseline date — the last PMMS `fecha_fuente` — falls in it**, decided by the pure function `mesesATraer`; example: run on Monday 2026-05-04 with baseline Thursday 2026-04-30 fetches `202605` and `202604`) | Atom/XML; per entry `NEW_DATE` and `BC_10YEAR` | Each business day after the market close | U.S. government, public domain; link the Treasury data page |
| `nyfed-objetivo` | Signal (Fed target range) | `https://markets.newyorkfed.org/api/rates/unsecured/effr/last/2.json` | JSON `refRates[]` with `effectiveDate`, `targetRateFrom`, `targetRateTo` | Each business day; the target range changes on the day after an FOMC decision | Public NY Fed data; link the Fed's open-market page and, for alerts, the FOMC statement list |

## Parsing rules (pure functions, tested with fixtures)

- **PMMS**: take the **last two** rows whose `pmms30` and `pmms15` are both non-empty numbers. Latest → `valor`/`fecha_fuente`; the one before → `previo`. Ignore empty trailing lines and the unused `*p`/`pmms51` columns. Dates convert to ISO `YYYY-MM-DD`.
- **Treasury**: parse all entries, keep those with a numeric `BC_10YEAR`, order by `NEW_DATE`; the latest is the current reading; the reading whose date equals the last PMMS `fecha_fuente` is the alert baseline (if that exact date is missing, the closest earlier business day, searching across the months fetched by `mesesATraer`). If no entry on or before the baseline date exists in any fetched month, there is no baseline: no Treasury alert is raised and the run log records `tesoro-10a: "sin base"`.
- **NY Fed**: take the latest entry's `targetRateTo` (upper bound) and `targetRateFrom`; a change is detected by comparing with the last stored `fed_hasta`. First-ever run stores the value and raises nothing (no baseline to compare).
- **Anything unexpected** (missing columns, non-numeric values, empty file, HTTP error, timeout): that source → `error`, no reading written, no alert.

## Deliberately not used in v1

- **Mortgage News Daily** daily index and **MBA** weekly applications data: terms could not be verified as allowing this use (research R3; FR-018). Adding either needs the owner to obtain written permission or a licensed feed.
- **FRED mirrors** of PMMS and of the Fed target: not needed (the publishers' own files work) and the Fed target series copy checked ended in 2021.

## Change control

If a source changes URL or format, only the parser for that source changes; the catalog (`id`, `nombre`, `mide`, `frecuencia`, `url`) is edited in one place in the logic module, and the source-facing text on the page follows from it.
