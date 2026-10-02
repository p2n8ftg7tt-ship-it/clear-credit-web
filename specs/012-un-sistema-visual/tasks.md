# Tasks: One Visual System (012)

**Input**: `plan.md` (including "Owner decisions"), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Scope agreed with the owner**: C1, C2, C8, C3, C4 (reduced: one definition per component, no text size changes), C5, C7. **Out of scope**: C6 (Auto Coach), the type scale (R6), commits and publishing.

**Test command**: `node --test tests/*.test.js`. Baseline: 426 tests, 408 pass, 18 fail. The 18 failures are pre-existing (casas, estadoCasa, ultimaRevisionEn, marcaDeAlerta, textoCasa). Acceptance: the same 18 names fail, and every new test passes.

`[P]` = can run in parallel with the other `[P]` tasks in its phase (different files).

## Phase 0: Setup

- [X] T001 Record the test baseline (426 / 408 / 18) and save the failing names to the scratchpad
- [X] T002 Take "before" screenshots of the 18 pages at 1440px and 375px (phone emulation via Edge DevTools Protocol) in the scratchpad, outside the repo

## Phase 1: Test first (red)

- [X] T003 Create `tests/sistema-visual.test.js` following `contracts/visual-system-test.md`, covering §A contrast, §B banned values, §C button shape, §D uppercase, §F single definition, §G legal figure and §H backup forms (§E is deferred by owner decision 8). Add §I from C8: `text-size-adjust` on `html`, `@view-transition` present, a fixed `.nav` height, and `nav.js` marking the active group. Confirm it fails.

## Phase 2: C1 Markup accessibility

- [X] T004 [P] `hidden` in place of `class="sr-only"` on `#agStaticForm` (agendar.html), `#fnStaticForm` (formar-negocio.html) and `#lnStaticForm` (listar-negocio.html)
- [X] T005 [P] cuenta.html: `aria-labelledby` on the 3 `.acct-toggle`; `role="status"` on the "Guardado" regions, empty until a save, with `flash()` writing and clearing the text; text size unchanged (decision 8); `type="tel"` on `profilePhone`
- [X] T006 [P] `autocomplete` and correct `type` on contacto, formar-negocio, listar-negocio and herramientas (the collector fields get `autocomplete="off"`); `spellcheck="false"` on email fields
- [X] T007 [P] admin.html: labels on `clientSearch`, `paBuscar`, `paCorreo`, `paReferencia` and `paServicio`; `type="email"` / `type="tel"` on `cmscorreo`, `cmstelefono` and `paCorreo`
- [X] T008 Link form errors to their fields (`aria-invalid` plus `aria-describedby`) in the credito letter forms and the herramientas letter generator (owner decision 5)

## Phase 3: C2 Role tokens

- [X] T009 Add `--texto-acento` to `:root`; move focus rules to `var(--focus-ring)` (styles.css, admin, cartas-claras, comprar-casa); add a focus-visible ring where `outline:none` had no replacement (`.tila-field`, `.auth-country-search`, `.fha-calc-input`, `.cmp-input`)
- [X] T010 Field borders on `--borde-campo` (styles.css, comprar-casa, contrato-auto, herramientas, admin; not inside the Auto Coach iframe)
- [X] T011 `color:var(--gold)` → `--texto-acento` on light backgrounds (dark ones → `--gold-light`); cuenta toggle "on" → `--accion`

## Phase 4: C8 Page transitions and uniform header

- [X] T012 `html{-webkit-text-size-adjust:100%;text-size-adjust:100%}`
- [X] T013 Subtle crossfade: `@view-transition{navigation:auto}`, `view-transition-name` on `header`, ≤180ms, disabled under reduced motion
- [X] T014 Fonts without a jump: metric-matched fallbacks (`@font-face` using `local()` with size-adjust and ascent/descent overrides) in `--font-display` / `--font-body`
- [X] T015 Fixed header: `.nav` height (72px, 64px at ≤720px), `.brand-logo` with fixed width and height in CSS and in the `<img>` of the 18 headers; the translucent background stays (owner decision 3)
- [X] T016 Fixed space for `#navAuthLink` so the swap to the avatar doesn't move the menu
- [X] T017 nav.js: `is-active` on the parent `.nav-group-btn` and `aria-current="page"` on the current link; allow `aria-current` in `tests/cabecera-pie.test.js` normalization
- [X] T018 cms.js: apply a value only when it differs; keep saved colors in `localStorage` and apply them from an inline `<head>` script before the first paint (18 pages)
- [X] T019 `[data-reveal]`: nothing in the first screen starts hidden

## Phase 5: C3 Leftovers and buttons

- [X] T020 Replace the brown values, gold gradients and `#171008` according to R5; log each one in `specs/012-un-sistema-visual/color-mapping-log.md`
- [X] T021 Action buttons with `var(--radius)`, the display font and sentence case (`.auth-cta-btn`, `.talk-actions .btn`, `.ct-select-btn`, `.ct-camera-btn`, the credito upload and report buttons); pills only for the allow-list
- [X] T022 Remove `text-transform:uppercase` outside the allow-list (without changing text size)

## Phase 6: C4 reduced, one definition per component

- [X] T023 Merge the duplicate `.btn*` and `.eyebrow*` blocks in styles.css into the later version; remove redefinitions from page `<style>` blocks. No text size changes.

## Phase 7: C5 Paper hero on credito

- [X] T024 Move the `.hm-*` component from index.html to styles.css as `.papel-muestra` (contract `paper-hero.md`); index.html must look the same
- [X] T025 New credito hero: the paper sample in lavender with a highlighted date and the 7-year note (FCRA §605); remove the photo slideshow; one primary button plus a text link; remove `.tint-green`
- [X] T026 Analyzer and the "Primero, revisa…" band on a light background with the lavender stripe; keep `#analizar-reporte`, `data-umami-event` and `data-cms`

## Phase 8: C7 Minor

- [X] T027 [P] "Escríbeme" → "Escríbenos" (contacto)
- [X] T028 [P] Heading order: admin.html:150, credito.html:601, terminos.html:124 (same look)
- [X] T029 [P] "Leyendo hojas..." → "Leyendo hojas…" (contrato-auto)
- [X] T030 [P] mortgage-calculator.js: inline message instead of `alert()`
- [X] T031 [P] `Intl.NumberFormat`: **not applied, on purpose.** mortgage-accelerator.js:195–196 writes into `<input type="number">`, which needs machine format ("12.34"; Intl would give "12,34" and the field would reject it). tasas-texto.js:91 already matches es-US Intl ("6.25") and its tests pin that format. Audit false positive.

## Phase 9: Validation (no commit, no push)

- [X] T032 `node --test tests/*.test.js`: only the 18 baseline failures, all new tests green
- [X] T033 "After" screenshots at 1440 and 375, compared with T002; measure header height and CLS on the 18 pages
- [X] T034 `graphify update .` (code) and a report to the owner. **Do not commit or push** (owner decisions 11 and 12).

## Phase 10: Owner follow-up (2026-09-28)

- [X] T035 Root cause of the "salto" and the "smaller letters" on credito (measured on the published mithemora.com): after a click, the top bar showed the fallback font (Arial) for ~0.9s before switching to Bricolage (`display=swap`), and longest on credito, the heaviest page. Fix: Google Fonts `display=optional` on the 18 pages (no mid-read font swap) plus the metric-matched fallbacks from T014. Verified locally: font ready at the first sample (~100ms) and the same "Inicio" width (66px) at every sample.
- [X] T036 Subtler transition: old page fades out in 120ms and the new one fades in over 200ms (`cubic-bezier(.2,0,0,1)`), with no midway blend; the header stays still; reduced motion disables it.
