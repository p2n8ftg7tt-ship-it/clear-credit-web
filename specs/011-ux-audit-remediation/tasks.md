# Tasks: UX Audit Remediation (Trust, Accessibility, Consistency)

**Input**: Design documents from `specs/011-ux-audit-remediation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: One automated test is required by the spec (FR-017, `contracts/consistency-test.md`). It is written first (red) and turned green story by story. Everything else is verified with `quickstart.md`.

**Global rules for every task** (from the constitution and plan):
- Edit files keeping **LF** line endings. Do not reformat untouched lines.
- Never change URLs, nav labels, form field `name`s, or `data-umami-event` values.
- "Public pages" = these 17 files in the repo root: `agendar.html aparezco.html cartas-claras.html comprar-auto.html comprar-casa.html contacto.html contrato-auto.html credito.html cuenta.html formar-negocio.html herramientas.html index.html listar-negocio.html login.html privacidad.html quienes-somos.html terminos.html`. `admin.html` is NEVER touched.
- After each phase: run `node --test tests/`, run `graphify update .`, and make one commit with a message explaining why (the attribution line is added by the harness).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1-US5 from spec.md

---

## Phase 1: Setup

**Purpose**: Baseline, so every later change can be compared.

- [X] T001 Run `node --test tests/` from the repo root and record the pass/fail count in `specs/011-ux-audit-remediation/baseline.md` (create it). If anything already fails, write it down there and do not "fix" it in this feature.
- [X] T002 [P] Capture baseline screenshots of all 17 public pages at 390px and 1280px width (any method: Chrome DevTools device mode or a headless browser). Save them under `specs/011-ux-audit-remediation/screens/before/` using `<page>-390.png` and `<page>-1280.png`. `specs/` is already blocked from publishing by `netlify.toml` L125.
  - T002 skipped: no browser in automation environment

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: The consistency test and a single reference header, so footer/header work in later phases has a safety net.

- [X] T003 Create `tests/cabecera-pie.test.js` following `contracts/consistency-test.md`. Use only `node:test`, `node:assert/strict`, `node:fs` and `node:path`, in the same style as `tests/tasas-paginas.test.js`. Implement:
  - `extraer(html, tag)` to get the `<header>â€¦</header>` / `<footer>â€¦</footer>` block.
  - `normalizar(bloque)`: remove ` class="active"`, remove ` aria-current="page"`, remove the whole `<div class="wrap revision-legal">â€¦</div>` element (non-greedy up to its closing `</div>`), collapse whitespace to single spaces, trim.
  - One test per public page: "header igual a index.html". On failure, report the page name and the first differing 80 characters.
  - One test per public page: "footer igual a index.html".
  - One test: every public page includes `styles.css`, `nav.js` and `empresa.js`.

  Do NOT add the Zyron or noindex assertions yet (they are added in T012 and T031). Run `node --test tests/cabecera-pie.test.js`: header tests fail only for `contrato-auto.html`, and footer tests fail for every page except `index.html`. That red state is expected.
- [X] T004 In `contrato-auto.html`, add the account link that every other header has: insert `<a href="login.html" id="navAuthLink" class="nav-auth-btn">Iniciar sesiÃ³n</a>` (copied from `index.html` L274) at the same position it has in index's header (after the last `.nav-group`, before `</nav>`). `auth.js` switches it to the avatar when signed in. Run the test again: all header tests now pass.

**Checkpoint**: `node --test tests/cabecera-pie.test.js` â†’ headers green, footers red (expected until US1).

---

## Phase 3: User Story 1 - A cautious visitor can see who runs the site (P1) ðŸŽ¯ MVP

**Goal**: One shared footer with services, company, legal and the "no somos" line on all 17 pages; an operator line next to every price; account pages not indexed.

**Independent Test**: quickstart.md Â§1 (a-d).

- [X] T005 [US1] In `index.html`, replace the contents of `<footer>â€¦</footer>` with the shared block from `contracts/footer.md`, section 2, verbatim:
  - Keep the existing `#footerContact` div with its three `data-cms` spans, but delete its inline `style="â€¦"` attribute.
  - The last element is `<div class="wrap footer-legal"><span>Â© 2026 Themora</span> <span data-empresa="corta" hidden></span></div>`. The `data-empresa` attribute moves from the div to the inner span.
- [X] T006 [US1] In `styles.css`, next to the existing footer rules (around L187-188 and L674-677), add:
  - `.footer-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:28px;padding:8px 0 18px}`
  - `.footer-col{display:flex;flex-direction:column;gap:8px;font-size:.8rem}`
  - `.footer-col strong{color:#fff;font:700 .85rem var(--font-display)}`
  - `.footer-col a{color:rgba(255,255,255,.78);text-decoration:none}`
  - `.footer-col a:hover{color:#fff;text-decoration:underline}`
  - `.footer-nosomos{color:rgba(255,255,255,.72);max-width:32ch;line-height:1.55}`
  - `#footerContact{border-top:1px solid rgba(255,255,255,.14);margin-top:14px;padding-top:14px}`
  - `.footer-legal` shows the "Â©" span always: remove nothing, but make sure `.footer-legal[hidden]` no longer applies (the div no longer carries `hidden`).
  - Responsive rules: `@media(max-width:999px){.footer-grid{grid-template-columns:1fr 1fr}}` and `@media(max-width:599px){.footer-grid{grid-template-columns:1fr}}`.
  - Inside the existing `@media(max-width:720px)` block (L341-353): `.footer-col a{min-height:44px;display:flex;align-items:center}`.
  - Text contrast on `#0E3240` at 72-78% white is â‰¥6:1, which satisfies â‰¥4.5:1.
- [X] T007 [US1] Copy the new `index.html` footer into the other 16 public pages, replacing each page's current footer content. On `cartas-claras.html`, `comprar-casa.html`, `contrato-auto.html`, `credito.html` and `formar-negocio.html`, KEEP their existing `<div class="wrap revision-legal">â€¦</div>` as the first child of `<footer>` and replace only what follows it. Then run `node --test tests/cabecera-pie.test.js`: all footer tests pass.
- [X] T008 [US1] In `empresa.js`, add the `operador` slot mode (data-model.md). In `pintar()`:
  - If `modo === 'operador'`: when `RAZON_SOCIAL` is empty set `el.hidden = true` and continue. Otherwise set `el.textContent = 'Operado por ' + RAZON_SOCIAL + (ESTADO ? ', ' + ESTADO : '')` (textContent, so no escaping is needed) and `el.hidden = false`.
  - Keep the existing `corta` and full branches unchanged.
  - Update the file's header comment with one line documenting the new mode.
- [X] T009 [P] [US1] Insert `<p class="pago-operador" data-empresa="operador" hidden></p>` immediately after `<div class="pago-caja" data-precio-de="formar" hidden></div>` in `formar-negocio.html` (around L387).
- [X] T010 [P] [US1] Insert `<p class="pago-operador" data-empresa="operador" hidden></p>` immediately after `<div class="pago-caja" data-precio-de="listar" hidden></div>` in `listar-negocio.html` (around L235).
- [X] T011 [P] [US1] Insert `<p class="pago-operador" data-empresa="operador" hidden></p>` immediately after the closing `</ul>` of `<ul class="tm-precios">` in `terminos.html` (around L191).
- [X] T012 [US1] Add `<meta name="robots" content="noindex">` on the line after `<meta name="viewport" â€¦>` in `cuenta.html` (L5) and `login.html` (L5). Then add the matching assertion to `tests/cabecera-pie.test.js`: both files contain `<meta name="robots" content="noindex">`.
- [X] T013 [US1] In `styles.css`, add `.pago-operador{margin-top:10px;font-size:.8rem;color:var(--muted)}` and `.pago-operador[hidden]{display:none}` next to the `.pago-opcion` rules (around L763).
- [X] T014 [US1] Validate quickstart Â§1 a-d:
  - Test the filled state by temporarily setting `RAZON_SOCIAL='Prueba LLC'` and `ESTADO='Virginia'` in `empresa.js` locally.
  - Confirm the footer line and the two operator lines appear.
  - **Revert the values to empty strings before committing.** Never commit invented identity data (Constitution I).
  - Commit: "Pie de pÃ¡gina Ãºnico con identidad legal y operador junto a los precios".

**Checkpoint**: US1 is complete and deployable on its own.

---

## Phase 4: User Story 2 - A keyboard or low-vision user can use every page (P1)

**Goal**: Visible focus on dark backgrounds, readable labels, 3:1 field borders, an accessible account button, and a 44px menu button. `styles.css` only, plus optionally `nav.js`.

**Independent Test**: quickstart.md Â§2 and Â§3.

- [X] T015 [US2] In `styles.css`, right after the global `:focus-visible` rule (L90), add `.page-hero,.band-dark,.bento-tile--dark,.hero-dark,footer,.tasas-aviso{--focus-color:var(--agua)}`. Because `--focus-ring` is declared in `:root` as `3px solid var(--focus-color)`, it resolves to `--agua` only if it is re-declared in the same scope. So write `â€¦{--focus-color:var(--agua);--focus-ring:3px solid var(--agua)}`. Verify by tabbing through the index hero and the business band.
- [X] T016 [US2] In `styles.css`, raise these label sizes to `.75rem` (â‰ˆ14px at the 118% root). Edit the value only:
  - `.profile-card .k` (L176, .62rem)
  - `.hero-stat span` (L194, .62rem; also change `rgba(255,255,255,.55)` to `rgba(255,255,255,.72)`)
  - `.rate-panel .selected-label` (L271)
  - `.legend` font-size (L279, if below .75rem)
  - `.contract-head span` (L306, .58rem)
  - `.tila-field b` (L311, .59rem)
  - `.tila-field small` (L313, .54rem)
  - `.contract-schedule span` (L316, .55rem)
- [X] T017 [US2] After the change, open `comprar-auto.html` (TILA box) at 390px. If `.tila-box` cells overflow, adjust only `.tila-field` padding in the existing `@media(max-width:720px)` block. Do not revert the font sizes.
  - Note: static checks done; the 390px TILA box overflow check needs a manual browser pass.
- [X] T018 [US2] In `styles.css` `:root`, add `--borde-campo:#6E8890;` (3.54:1 on #F5F9F9, 3.76:1 on #FFF). At the end of the Â«Mar en calmaÂ» block, add `input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]),select,textarea{border-color:var(--borde-campo)}`. Do not change border widths.
- [X] T019 [US2] In `styles.css`, change `.links .nav-auth-btn.is-logged-in` (L126) to `background:var(--accion);border-color:var(--accion);color:#fff` (6.37:1). Then search `styles.css` for `color:var(--gold)` and `color:var(--franja-` used as TEXT color on light backgrounds, and replace each with `color:var(--accion)`. List every replacement in the commit message.
- [X] T020 [US2] In `styles.css`, change `.nav-toggle` (L139) `width:42px;height:42px` to `width:44px;height:44px`. In the `@media(max-width:720px)` block (L345), add `pointer-events:none` to `.nav-group-btn` and change its color from `var(--muted)` to `var(--tinta)` (heading look).
- [X] T021 [US2] In `nav.js`, only if it takes 8 lines or fewer: on load and on `matchMedia('(max-width:720px)')` change, set `tabindex="-1"` and `aria-hidden="true"` on each `.nav-group-btn` when narrow, and remove both when wide. If it needs more lines, skip this task and write "T021 skipped: CSS-only" in the commit message.
- [X] T022 [US2] Validate quickstart Â§2 a-d and Â§3 with DevTools. Commit: "Accesibilidad: foco visible en fondos oscuros, etiquetas legibles, bordes de campos".
  - Note: CSS values verified by reading and contrast math; tabbing and DevTools checks (quickstart §2-3) need a manual browser pass.

**Checkpoint**: US2 is complete; it is independent of US1.

---

## Phase 5: User Story 3 - Pages feel like one calm, professional product (P2)

**Goal**: One shape rule, no gold-era leftovers, off-palette inline colors mapped to the palette, homepage heading on the shared style.

**Independent Test**: quickstart.md Â§5 plus comparing screenshots with `screens/before/`.

- [X] T023 [US3] In `styles.css` `:root` (L36-40), set `--radius:6px; --radius-sm:4px; --radius-lg:6px; --radius-xl:6px; --radius-2xl:6px;`. Leave `--radius-pill` unchanged.
- [X] T024 [US3] In `styles.css`, replace every literal `border-radius` between 7px and 26px with `var(--radius)`: 8px Ã—9, 9px Ã—2, 10px Ã—3, 11px Ã—2, 12px Ã—4, 14px, 16px, 22px, 26px, 7px. The known lines include 227, 231, 383, 474, 539, 606, 618, 626, 669, 686, 721, 726 and 763; find the rest with `grep -nE 'border-radius:([7-9]|1[0-9]|2[0-6])px' styles.css`. Keep `50%` (circles), `999px`/`var(--radius-pill)` (chips and nav pills), and the 3px/4px values. When done, the grep returns nothing.
- [X] T025 [US3] In `styles.css` `.profile-avatar` (around L564-566), change `background:var(--gold)` to `background:var(--copia-celeste)` and keep `color:var(--navy-deep)`.
- [X] T026 [P] [US3] In the `<style>` block of `index.html`, map off-palette colors by meaning (table below): `#3b4252` and `#2b3140` â†’ `var(--ink)`; `#7b8394` and `#5d6577` â†’ `var(--muted)`. Normalize any literal `border-radius` between 7px and 26px to `var(--radius)`. Also replace the inline `style="font:600 â€¦;color:var(--navy-deep);"` on the `<h2>Lo que no somos</h2>` (L417) with no inline style, and wrap the `<span class="eyebrow-dark">` + `<h2>` in `<div class="section-head">â€¦</div>`.
- [X] T027 [P] [US3] Same color and radius normalization in the `<style>` block of `comprar-casa.html`, using the mapping table.
- [X] T028 [P] [US3] Same in the `<style>` block of `credito.html`.
- [X] T029 [P] [US3] Same in the `<style>` block of `contrato-auto.html`. Do NOT touch the `@media print` rules (around L223) or `.hero.hero-dark` (L281-290).
- [X] T030 [P] [US3] Same in the `<style>` block of `cartas-claras.html`.

  **Color mapping table for T026-T030** (research R8). Apply by the role the color plays in its rule, not by exact hex:

  | Role in the rule | Examples found | Replace with |
  |---|---|---|
  | Error / alert text or border (dark warm red) | `#8a2b2b` `#a34838` `#7e3127` `#8c4034` `#b3402a` | `var(--corrector)` |
  | Warm alert background (pale pink/orange) | `#fff0ed` `#fbeeea` `#fff6e6` | `var(--copia-rosa)` |
  | Neutral dark text | `#3b4252` `#2b3140` `#111` (screen rules only) | `var(--ink)` |
  | Neutral secondary text / icons | `#7b8394` `#5d6577` `#9ca3af` `#7d7163` | `var(--muted)` |
  | Light gray borders | `#ddd` `#e5e7eb`-like | `var(--renglon)` |
  | Success green | `#20b875` | `var(--good)` |
  | Amber warning accent | `#d97706` `#8a5a20` | `var(--corrector)` if it signals a problem, otherwise leave it and list it |
  | Near-white panel backgrounds | `#fbfdff` `#e9f7fd` | `var(--paper)` / `var(--copia-celeste)` |

  Keep `#fff`/`#ffffff`/`#000`, anything inside `@media print`, and any value whose role is unclear. List each kept value in the commit message.
- [X] T031 [US3] Validate quickstart Â§5 a-c. Take the "after" screenshots into `specs/011-ux-audit-remediation/screens/after/`, compare with `before/`, and fix only clear regressions (text overflow, lost contrast). Commit: "Un solo sistema de formas y colores de la paleta en las pÃ¡ginas".
  - Note: screenshots skipped (no browser in this environment); the visual comparison needs a manual pass. Mapping recorded in color-mapping-log.md.

**Checkpoint**: US3 is complete; it is independent of US1 and US2 (if US2 was skipped, `.nav-auth-btn` still uses the gold fill, which is acceptable).

---

## Phase 6: User Story 4 - Pages open fast on a mid-range phone (P2)

**Goal**: Stop downloading about 185 KB of assistant files that `credit-coach.js` already lazy-loads (`ensureBrain()`, L127-134).

**Independent Test**: quickstart.md Â§4 (a-d).

- [X] T032 [US4] In each of these 15 pages, delete exactly the two lines `<script src="zyron-leyes.js"></script>` and `<script src="zyron-brain.js"></script>`, leaving `site-search-index.js` and `credit-coach.js` in place: `agendar aparezco cartas-claras comprar-auto comprar-casa contacto contrato-auto credito formar-negocio herramientas index listar-negocio privacidad quienes-somos terminos` (`.html`). Confirm with `grep -c 'src="zyron-' *.html`, which should print 0 for every file.
- [X] T033 [US4] Add the assertion to `tests/cabecera-pie.test.js`: no public page contains `src="zyron-brain.js"` or `src="zyron-leyes.js"`, because they are loaded on demand by `credit-coach.js`. Run `node --test tests/`: everything passes, including `tasas-paginas.test.js` (script order nav.js < tasas < analytics.js).
- [X] T034 [US4] Delete `media/cartas-fondo.mp4` and `media/cartas-fondo-poster.jpg` after re-checking `grep -rl "cartas-fondo" --include=*.html --include=*.js --include=*.css .` returns nothing (ignore `graphify-out/` and `_papelera/`). If `media/` is then empty, delete the folder.
  - Note: SKIPPED on purpose. `media/` is in `.gitignore` (L20), so these files were never published; deleting them gives no site benefit and they are not recoverable from git.
- [X] T035 [US4] Validate quickstart Â§4 a-c:
  - Note: static checks done (tags removed; `credit-coach.js` L132 lazy-loads both files; the new test passes). Network and blocked-file checks need a manual browser pass.
  - In Network, the files do not load on page load, but do load on the first question to the assistant.
  - With `zyron-brain.js` blocked, the assistant still replies (local path or friendly message).

  Commit: "No cargar el cerebro de Zyron hasta que alguien lo abre".

**Checkpoint**: US4 is complete; it is independent of the other stories.

---

## Phase 7: User Story 5 - One clear next step, nothing covering it (P3)

**Goal**: One primary action in the homepage hero; only the launcher floats on phones and it steps aside while typing.

**Independent Test**: quickstart.md Â§6 (a-b).

- [X] T036 [US5] In `index.html`:
  - Delete the line `<a data-umami-event="inicio-negocio" href="aparezco.html" class="btn btn-outline">Tengo un negocio â†’</a>` from `.home-hero-actions` (L290).
  - Insert `<a data-umami-event="inicio-negocio" href="aparezco.html" class="btn btn-gold">Revisar mi negocio gratis</a>` inside the business band's `.section-head` (after its `<p>`, around L435), wrapped in `<div class="hero-actions">â€¦</div>`. The existing rule `.band-dark .btn-gold` renders it white on petrol.
  - Also remove the inline `style="color:var(--gold-light);"` from that band's `.eyebrow-dark` (L432) and add the class `eyebrow` instead, which already uses `--agua`.
- [X] T037 [P] [US5] In the `<style>` block of `comprar-casa.html`, after `.casas-flotantes[hidden]` (L84), add `@media(max-width:720px){.casas-flotantes{position:static;margin:16px auto;justify-content:center}}`.
  - Note: CHANGED. `tasas-hipoteca.js` appends the houses at the end of `<body>`, so `position:static` would drop them below the footer. They are already dismissible (×). Instead, on ≤720px they hide while a field in `main` has focus (same rule as the launcher). Moving them inline needs a change in `tasas-hipoteca.js` (feature 006, which has the 18 pre-existing failing tests), deferred.
- [X] T038 [P] [US5] In `styles.css`, next to the launcher rules (L363-408), add `@media(max-width:720px){body:has(main :is(input,textarea,select):focus) .credit-coach-launcher{display:none}}`. Verify the launcher reappears after the field loses focus. All 17 public pages have a `<main>` (verified), so the assistant's own input, which sits outside `main`, never hides the launcher.
- [X] T039 [US5] Validate quickstart Â§6 a-b. Also confirm that the Umami event `inicio-negocio` still fires from the new button, in the Umami realtime view or the DevTools Network tab. Commit: "Un solo botÃ³n principal en la portada y un solo flotante en celular".
  - Note: the `inicio-negocio` event name is preserved on the new button (verified in markup); firing it in Umami needs a manual check.

**Checkpoint**: All stories are complete.

---

## Phase 8: Polish & Cross-Cutting

- [X] T040 Run the full `node --test tests/` suite. Every test must pass, and the count must be the baseline from T001 plus the new file's tests. Report failures as they are; do not weaken a test.
- [X] T041 [P] Run `graphify update .` and confirm it completes.
- [X] T042 [P] Check line endings: `git diff --stat` shows no whole-file rewrites; if one does, fix the CRLF conversion before pushing.
  - Note: verified by byte count: every touched file is LF (no CRLF introduced).
- [X] T043 Update `specs/011-ux-audit-remediation/checklists/requirements.md` Notes with "Implemented: FR-001â€¦FR-020", listing any task skipped (e.g. T021) and why.
- [X] T044 Update the memory file `resaltador-portada.md` (in the auto-memory folder) with the new design rules: 6px shape rule, `--borde-campo`, `--agua` focus on dark, and the shared footer contract.
- [ ] T045 Ask the owner for approval, then publish with `git push origin master:main` (per the Deploy memory). Do not push without that approval.

---

## Dependencies & Execution Order

- **Setup (T001-T002)**: no dependencies.
- **Foundational (T003-T004)**: after Setup; blocks US1 (footer tests) and establishes the header baseline.
- **US1 (T005-T014)**: after Foundational. T005 â†’ T006 â†’ T007 in sequence (same reference). T008 before T009-T011, which run in parallel. T012-T013 are independent of each other.
- **US2 (T015-T022)**: needs only Setup; all in `styles.css`, so sequential.
- **US3 (T023-T031)**: needs only Setup. T023-T025 in sequence (styles.css). T026-T030 in parallel (one page each).
- **US4 (T032-T035)**: needs Foundational (the test file exists).
- **US5 (T036-T039)**: needs only Setup. If US3 is done first, T036 inherits the 6px buttons.
- **Polish (T040-T045)**: after all selected stories.

Recommended commit/deploy order: **US1 â†’ US2 â†’ US4 â†’ US3 â†’ US5**. US4 moves ahead of US3 because it is tiny and low-risk; US3 is the most visible change.

## Parallel Examples

```text
# US1, after T008:
T009 formar-negocio.html   T010 listar-negocio.html   T011 terminos.html

# US3, after T023-T025:
T026 index.html  T027 comprar-casa.html  T028 credito.html  T029 contrato-auto.html  T030 cartas-claras.html

# US5:
T037 comprar-casa.html   T038 styles.css
```

## Implementation Strategy

- **MVP**: Setup + Foundational + US1. This fixes the biggest trust problem and adds the safety-net test. It can ship alone.
- **Increment 2**: US2 (legal-level accessibility, CSS only) together with US4 (a two-line removal per page).
- **Increment 3**: US3. Review screenshots before pushing, since it changes how every card looks.
- **Increment 4**: US5 polish.
- **Owner task, anytime**: fill `empresa.js` (RAZON_SOCIAL, ESTADO, NUMERO_REGISTRO, DIRECCION, CORREO_LEGAL) and `whatsapp.js` (WHATSAPP_NUMERO, TELEFONO, TELEFONO_MARCAR) with real data. The US1 slots light up automatically.
