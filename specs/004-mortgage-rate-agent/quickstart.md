# Quickstart: validating the Mortgage Rate Watch Agent

How to prove the feature works end to end once it is built. Nothing here is implementation code; see [contracts/](./contracts/) and [data-model.md](./data-model.md) for shapes.

## Prerequisites

- Node 18+ (same as the existing tests). No new packages.
- A Supabase project with `supabase-schema.sql` applied (the new `tasas_*` tables) and these Netlify environment variables **already set** (they exist for the admin panel): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Your account marked `is_admin` in Supabase (Paso 1 of `INSTRUCCIONES-ADMIN.md`).
- `INSTRUCCIONES-TASAS.md` written and followed (created in the tasks phase).

## A. Automated checks (no network, no database)

```text
node --test tests/
```

Expected: all existing suites still pass, plus the new ones:

| Suite | Proves |
|---|---|
| `tests/tasas-hipoteca-logica.test.js` | PMMS/Treasury/NY Fed parsing against `tests/fixtures/tasas/`; threshold at 0.125 (0.12 → no alert, 0.125 → alert); dedupe (same condition never raises twice); Treasury hysteresis (clears at ≤ T/2); Fed cut/hike raises, Fed hold does not; implausible values held; freshness `al_dia`/`sin_actualizar`/`sin_datos`; next-refresh date; Monday/Tuesday = publish, other days = watch (FR-006, 007, 010–013, 019, 029) |
| `tests/tasas-texto.test.js` | every generated string (all alert kinds, banner, block, stale, empty) contains no forbidden advice/prediction word; Treasury and Fed texts say the weekly average is not yet republished; Fed text says the Fed does not set mortgage rates directly (FR-003, 011, 029, 032; SC-006) |
| `tests/tasas-paginas.test.js` | the banner script is on exactly the agreed pages and not on `login`, `cuenta`, `admin`, `privacidad`, `terminos` (SC-003b); `comprar-casa.html` has `#tasas` with no typed rate number; `netlify.toml` blocks `INSTRUCCIONES-TASAS.md` and has the schedule; CSP unchanged |

A failing test is reported as is; tests are not weakened to pass (constitution).

## B. Manual walkthrough (after the first deploy)

1. **Both launch switches are off** (`TASAS_LANZADO = false`, `activo = false`): open `comprar-casa.html` and any banner page. Expected: nothing about rates is visible anywhere, the network tab shows **no request** to `tasas-hipoteca`, and `privacidad.html` and `site-search-index.js` do not mention the feature.
2. **First run**: Netlify UI → Functions → `tasas-agente` → **Run now** (on a Monday/Tuesday it publishes; on other days it only watches — to test publishing on another day use the documented one-off override in the instructions). Expected in the owner view: a run row with `ok` and the three sources answered.
3. **Turn it on** (launch): make the launch commit — the privacy line (T057), the search entry (T058) and `TASAS_LANZADO = true` (T059) — deploy, then set `tasas_config.activo = true`. To preview earlier, set `TASAS_LANZADO = true` in a local, uncommitted copy only. Reload `comprar-casa.html#tasas`. Expected: 30- and 15-year figures, change vs previous, "publicado por Freddie Mac el …", "Revisado …", "Próxima revisión …", source links, and the disclaimer. Compare the two numbers against `https://www.freddiemac.com/pmms` — they must match exactly.
4. **Phone width** (360 px, browser dev tools): no horizontal scroll; figures, dates and links readable (SC-001).
5. **Alert + banner**: set `tasas_config.umbral_pp` to a very small value (e.g. `0.01`), Run now, wait ≤ 5 minutes (cache). Expected: an alert card in the block; a banner on `index.html`, `herramientas.html`, `credito.html` …; **no** banner on `login.html`, `cuenta.html`, `privacidad.html`, `terminos.html`. Dismiss the banner, reload another page: it stays hidden. Restore the threshold to `0.125` afterwards.
6. **New alert re-shows the banner**: trigger a different alert (or edit the dismissed id in local storage) → banner returns.
7. **Failed refresh is honest**: temporarily break one source (instructions describe a safe way, e.g. an invalid URL in a preview deploy) and Run now. Expected: run shows `parcial`/`fallo` with the failing source; the block keeps the last figures with their original dates and (after a missed Mon/Tue slot) the "No pudimos actualizar" notice; no number appears that Freddie Mac did not publish (FR-008).
8. **Hold on implausible data**: insert a test reading with a > 1.0 pp jump through the table editor's documented test path; Run now. Expected: it appears under "retenidas" in the owner view and is **not** shown on the page (FR-019).
9. **Fed hold vs change**: with fixtures (automated) — a hold produces nothing, a target change produces the Fed alert text.
10. **Owner view**: open the admin panel → "Agente de tasas". Expected: last runs, which sources answered, age of the last success, held readings, active alerts, and the last 14 expected days with any miss visible; a normal visitor or non-admin account gets nothing (FR-020, FR-031).
11. **Failure isolation**: block the endpoint (offline mode). Expected: the rest of `comprar-casa.html` (roadmap, loan types, comparator) works; the block says honestly it is unavailable; other pages show no banner and no console error that stops scripts (SC-005).
12. **Analytics**: with analytics on, confirm the events listed in [contracts/ui-block-and-banner.md](./contracts/ui-block-and-banner.md) appear and carry no numbers or free text (SC-008).

## C. Four-week trial (success criteria SC-002, SC-003)

For four weeks, on every Monday and Tuesday check that the page shows a reading dated (checked) that day or an explicit "not refreshed" notice, and on any day a move ≥ 0.125 pp occurs check the alert/banner is visible by the end of the next day. Record hits/misses in the owner's notes; the owner view's expected-days list is the evidence.

## D. After any code change

Run `node --test tests/`, then `graphify update .` (constitution), and confirm `git diff --stat` shows no whole-file line-ending rewrites (LF only).
