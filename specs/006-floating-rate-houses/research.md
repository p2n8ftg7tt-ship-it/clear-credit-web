# Research: Floating Rate Houses

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

All open questions from the spec were closed in the 2026-09-21 clarification (option C). The items below are the design decisions the plan rests on. Evidence was read from the repository on 2026-09-21.

## R1 — Where the code lives: extend the existing script, do not add a second one

**Decision**: draw the houses inside `tasas-hipoteca.js`, from the same `datos` object the `#tasas` block already gets; keep all text/state logic in `tasas-texto.js`.

**Rationale**: `tasas-hipoteca.js` already (a) is loaded with `defer` on `comprar-casa.html`, (b) owns the `TASAS_LANZADO` launch constant and returns before any request while it is `false`, (c) makes the single snapshot fetch. Reusing it gives one launch switch (FR-017), one request, and identical figures by construction (FR-016). Wording in `tasas-texto.js` is already covered by the forbidden-word tests (SC-006).

**Alternatives rejected**: a new `tasas-casas.js` — would need its own launch constant (two switches that can disagree) and its own fetch (two responses that can disagree by one cache window).

## R2 — How the house is drawn: CSS shape, no images or libraries

**Decision**: a `<button>` whose background is a pentagon made with `clip-path: polygon(50% 0, 100% 40%, 100% 100%, 0 100%, 0 40%)`; the term label ("30 años") and the rate ("6.95 %") are ordinary text inside it.

**Rationale**: text stays real text (screen readers, zoom, high-contrast mode, the rate is copyable), no asset to host or cache, no CSP change, and it works with the project's fake-DOM tests (`createElement` only — no SVG namespace needed). Colors reuse the page's tokens (`--navy-deep`, `--gold`, `--gold-light`).

**Alternatives rejected**: inline SVG (needs `createElementNS`, more test scaffolding, no benefit); an image/emoji house (rate must be text and the shape must scale); an icon font/library (new dependency, breaks "no build, no new dependency").

## R3 — Placement and overlap

**Finding**: the only existing floating element on this page is the assistant launcher (`.credit-coach-launcher`, fixed, right 22 px, bottom 22 px, z-index 200, 56 px) and its panel (right 22 px, bottom 88 px, up to 368 px wide, z-index 200). `comprar-casa.html` also has a full-screen tool overlay `.fha-world` (fixed, inset 0, z-index 300). The site header is sticky at the top (z-index 100).

**Decision**: a `position: fixed` group at **bottom-left** (left 16 px, bottom 16 px; 12 px on phones), `z-index: 140` — above the sticky header's level but **below** the assistant (200) and the full-screen tool (300), so both of those always win. Houses sit side by side on phones (≈ 88 × 80 px each) and stacked on desktop ≥ 900 px. At 360 px width the houses end around x = 200 and the assistant starts around x = 282: no collision.

**Overlap rule (spec FR-003 / SC-002, reworded)**: no fixed overlay can cover *nothing* on a phone. The plan guarantees what matters: the group is small, sits in the corner opposite the assistant, is **hidden while a form field has focus** (`focusin`/`focusout` on `input, select, textarea`) and while a full-screen tool is open (the two `.fha-world` dialogs, `#fhaWorld` and `#convWorld`, are opened and closed through their `hidden` attribute, so a `MutationObserver` on that attribute is enough; if `MutationObserver` is missing the group simply stays under them thanks to z-index 300), reserves bottom padding on the page so the last content is never trapped behind it, and can be dismissed for the visit (R8).

**Alternatives rejected**: right side (collides with the assistant); top (collides with the sticky header and nav menu); inline, non-floating houses (not what was asked).

## R4 — "Without reloading": a slow refresh while the tab is visible

**Decision**: after the first render, call the same fetch again every **15 minutes** while `document.visibilityState === 'visible'`, and once when a hidden tab becomes visible again if more than 15 minutes have passed. The result goes through the same `pintar…` function for both the block and the houses. A failed poll changes nothing on screen except that freshness is recomputed from the last good data (a figure older than its expected window turns into "Sin actualizar" by the existing rule).

**Rationale**: the headline changes once a week; alerts change at most daily. The CDN already serves the snapshot for 5 minutes (`s-maxage=300`), so polling adds no database load. Satisfies FR-007 and the "page open for a long time" edge case without new infrastructure.

**Alternatives rejected**: WebSocket / server-sent events (new infrastructure to push data that changes a few times a week); polling every minute (no benefit over the cache window).

## R5 — What "activo" means, and why the snapshot gets one extra field

**Finding**: the snapshot's `frescura` (`al_dia` / `sin_actualizar` / `sin_datos`) is computed from the last **Monday/Tuesday publish** only (`calcularFrescura(publicado_en)`). The agent also runs every other day of the week (watch-only runs recorded in `tasas_corridas`), but nothing in the snapshot proves those runs happened. A house saying "activo — vigilando a diario" mid-week could therefore be false without anyone noticing (violates Principle I and FR-009).

**Decision**: add one field, `ultimaRevisionEn` — the start time of the most recent run whose result was `ok` or `parcial` (read from `tasas_corridas`, latest one row). The browser computes the house state with the pure function `estadoCasa(datos, ahora)`:

- `activo` — `frescura = al_dia` **and** (`ultimaRevisionEn` missing **or** less than 48 h old);
- `sin_actualizar` — `frescura = sin_actualizar`, **or** the last check is older than 48 h;
- (`sin_datos` — no houses drawn, FR-011).

The panel shows "Última revisión del agente: {fecha}" when the field exists, and never the phrase "en vivo". A missing field (older cached response, or a database read that failed) means the house makes **no claim** beyond the block's own `frescura`, never a false one.

**Rationale**: 48 h covers a missed weekend day without flapping, while a genuinely dead agent shows as "Sin actualizar" within two days. The change is additive: snapshot `version` stays `1`, existing consumers ignore the field.

**Alternatives rejected**: static "vigilando a diario" text (unprovable); exposing the whole run log (leaks owner-only detail, contradicts 004's contract that run logs are never public); marking daily watching in a new table (an existing table already has it).

## R6 — The details panel: one shared, non-modal panel

**Decision**: each house is a `<button aria-expanded aria-controls="casasPanel">`. Activating either house opens **one shared panel** (`role="region"`, `aria-labelledby` the panel title) filled for that term; activating the other house switches its content; activating the same house again, the close button, or **Escape** closes it, and focus returns to the house that opened it. It is non-modal (does not trap focus, does not dim the page), scrolls inside itself (`max-height: min(70vh, 460px)`, `overflow: auto`) and is `max-width: calc(100vw - 24px)` so it never causes horizontal scroll.

**Rationale**: FR-013 and Story 3. Two panels would need duplicated logic and could overlap; a modal would be heavy for a small reference card and would block the page the visitor is reading.

**Panel content, in order** (all from `textoPanelCasa`): term title; the rate; the change; "publicado por Freddie Mac el {fecha}"; "Última revisión del agente: {fecha}" (if known); any active alert for that term (`textoAlerta`); "De dónde salen los números" — headline source + the two signals, each with what it measures, how often, link (`textoFuentes`); the Fed line ("Las tasas hipotecarias no las fija directamente la Reserva Federal…"); "Ver las tasas de cada prestamista" + lender links (R7); the reference-only disclaimer (the same `avisoLegal` string as the block); link "Ver el detalle completo" to `#tasas`.

## R7 — Lender links (clarification option C, FR-022)

**Decision**: a short array `PRESTAMISTAS = [{ nombre, url }]` in `tasas-texto.js`, empty-safe (if empty, the section is omitted rather than shown blank). Links are `<a target="_blank" rel="noopener noreferrer">` with **no query string, no referral or tracking parameter**, and `data-umami-event="tasas-prestamista-abierto"` (no lender name in the analytics event). The section title is fixed text, followed by the required notice: the rates on those pages are each lender's own and vary by borrower. The list is unranked (alphabetical order, stated in a test) and carries no logos or endorsement wording.

**Candidates for the owner to approve** (names only; **URLs are not asserted here** because lender sites often block automated checks — each must be opened by hand, task G-LENDERS): Bank of America, Chase, loanDepot, Rocket Mortgage, U.S. Bank, Wells Fargo. The owner may add or drop any. Wholesale-only lenders are excluded because a visitor cannot use them directly.

**Test rules** (`tasas-texto.test.js`): every entry has a non-empty name and a URL that starts with `https://`, has no `?` or `#tracking`, no duplicate names, is sorted alphabetically, and the names/notice contain no forbidden word and no digit-percent pattern (so a rate can never slip into the list).

**Alternatives rejected**: fetching lender rates (terms of use, decided out in 004 and in the clarification); a lookup service to discover lender pages (new third party, out of scope); sponsored ordering (endorsement, Principle I).

## R8 — Dismissing the houses

**Decision**: a small "×" on the group hides both houses and stores `themora_casas_cerradas = "1"` in **`sessionStorage`** (per visit/tab), every access in `try/catch`. If storage is blocked, the houses hide for the current page view and return on the next load. The fixed `#tasas` block is unaffected, so rates stay reachable (FR-014). Analytics: `tasas-casas-cerradas` (no properties).

**Rationale**: the spec says "for the current visit". `sessionStorage` matches that exactly and expires by itself; a persistent `localStorage` dismissal could hide a future rate alert forever.

**Alternatives rejected**: `localStorage` (never returns); a cookie (personal-data banner questions, sent to the server for no reason).

## R9 — Alert mark: which house shows it

**Decision**: `marcaDeAlerta(datos, termino)` is true when an active alert has `termino === '30'|'15'` matching the house, **or** `termino === null` (Treasury and Fed alerts concern mortgage rates in general → both houses show the mark). The mark is text plus shape ("Aviso" badge, not color alone). The alert text in the panel is `textoAlerta(alerta)`, i.e. exactly the block's text, including "el promedio semanal de Freddie Mac todavía no se ha vuelto a publicar" for supporting signals — the house's own number never changes because of a signal (FR-012 here, FR-029 of 004).

## R10 — Accessibility and reduced motion

**Decision**: each house's accessible name is built by `textoCasa`: "Hipoteca fija a 30 años: 6.95 %, sube 0.19 puntos porcentuales, publicado por Freddie Mac el 17 sep. Estado: activo. Abrir detalles." The group is a `<div role="group" aria-label="Tasas hipotecarias de referencia">`. Status and alert mark use text/shape, not only color. Contrast: gold-light on navy-deep. Focus ring visible (`:focus-visible`). The gentle "float" animation is declared **only** inside `@media (prefers-reduced-motion: no-preference)`; with reduced motion the houses are static (FR-004; the global reduced-motion rule at `styles.css:445` also applies). A `<noscript>` is not needed: without JavaScript nothing is drawn.

## R11 — Analytics

**Decision**: new categorical events through the existing safe wrapper `window.ThemoraStats.evento`: `tasas-casa-vista` (`{ termino: '30'|'15' }`, once per render of a term the first time), `tasas-casa-abierta` (`{ termino }`), `tasas-casas-cerradas`, and `data-umami-event` on links: `tasas-fuente-abierta` (existing), `tasas-prestamista-abierto` (new). `tests/tasas-paginas.test.js` keeps its allowlist; it is extended with these names. No rate, date, alert id or lender name is ever an event property (FR-019, SC-008).

## R12 — Testing and visual check

**Decision**: (a) pure logic (`estadoCasa`, `marcaDeAlerta`, `textoCasa`, `textoPanelCasa`, lender-list rules) tested in Node like the rest of `tasas-texto.js`; (b) the real `tasas-hipoteca.js` run in the existing fake-DOM harness, extended with `document.addEventListener`, `setInterval`, `sessionStorage`; (c) page tests over `comprar-casa.html` and `netlify.toml`; (d) for the human visual/keyboard/phone check, a throwaway `tests/preview-casas.js` that serves the repo folder and answers `/.netlify/functions/tasas-hipoteca` from fixtures, rewriting `TASAS_LANZADO = false` to `true` **in the response only** (never in the file), so the owner can see fresh / stale / alert / no-data states without touching Supabase or deploying.

**Alternatives rejected**: a headless-browser test dependency (new dependency, heavier than the project's pattern); changing `TASAS_LANZADO` in the real file for a demo (risks shipping it on).

## Sources to keep unchanged (from feature 004, not reopened)

Headline: Freddie Mac PMMS (weekly). Signals: U.S. Treasury 10-year yield (daily), NY Fed target range (on decisions). Not used: Mortgage News Daily and MBA (terms not verifiable). Adding a licensed daily feed remains a possible future upgrade, only after written permission (spec Assumptions).
