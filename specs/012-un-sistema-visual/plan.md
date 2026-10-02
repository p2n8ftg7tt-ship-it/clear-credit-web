# Implementation Plan: One Visual System

**Branch**: `012-un-sistema-visual` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-un-sistema-visual/spec.md`

## Summary

Enforce the UI rules spec 011 wrote, and retire what it left underneath. Changes C1–C3 are low-risk value and markup fixes that repair accessibility and remove palette leftovers on all 18 pages. C4 gives each shared component one definition and applies a real type scale. C5 tries the home page's "paper + highlighter" hero on credito. C6 brings the Auto Coach iframe into the system, and C7 collects the minor fixes. Everything reuses existing pieces: the `--focus-color` and `--text-*` tokens, the `.copia-*` tool colors, the home hero markup, the `node --test` suite and the installed Edge for screenshots. No dependency or build step is added. Legacy token names stay, because the admin color editor writes them at runtime (research R1).

## Owner decisions (2026-09-28, `Detalles de revisión.md`)

| # | Decision | Effect on this plan |
|---|---|---|
| 1 | The top bar looks smaller on credito (seen by the owner) | C8. Not reproducible in Edge at 375/900/1100/1440px, locally or on the published build: both measure 73px, with the same font sizes. Most likely the fallback font is visible longer on credito, the heaviest page. Fixed by C8 steps 2 and 8; the owner checks it afterwards. |
| 2 | Very subtle crossfade; remove the jumps | C8 step 1 with a short crossfade (≤180ms) |
| 3 | Keep the top bar's color as it is | C8 step 3 changes only height and logo size; the translucent background stays |
| 4 | Low-risk fixes first, then design | Order: C1 → C2 → C8 → C3 → C4 (reduced) → C5 → C7 |
| 5 | Do what is recommended (form errors) | C1 also links form errors to their fields on credito and herramientas |
| 6 | Remove the credito photo; build the paper sheet | C5 goes ahead |
| 7 | The colors are fine | C2 as planned |
| 8 | Text sizes are fine | **No text size changes.** C4 is reduced to one definition per component (R7); the type scale (R6, contract §E) is deferred |
| 9 | Do nothing in Auto Coach | **C6 deferred** |
| 10 | "Escríbenos" | C7 |
| 11 | Don't commit yet | No commits |
| 12 | Don't publish or push to GitHub | No `git push` |

Note: `origin/main` (what is published) is at `7266b1a`, 4 commits behind local `master`. Spec 011 has not been published yet either.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES2017+), no framework

**Primary Dependencies**: none new. Existing: Google Fonts (Bricolage Grotesque, Literata), Supabase JS (CDN, `cms.js` reads `contenido_sitio`), Umami

**Storage**: N/A. Admin color overrides stay in Supabase `contenido_sitio`, unchanged.

**Testing**: `node --test tests/` plus the new `tests/sistema-visual.test.js` (contract in `contracts/visual-system-test.md`), headless-Edge screenshots before and after, and the manual screen-reader and phone-width steps in `quickstart.md`

**Target Platform**: static site on Netlify; current evergreen browsers, iOS Safari, mid-range Android; NVDA + Firefox/Chrome and VoiceOver + Safari

**Project Type**: static multi-page website

**Performance Goals**: no regression. C5 removes 4 full-size hero photos from credito (net gain).

**Constraints**:
- No build step.
- LF line endings.
- Preserve every `data-umami-event` value, URL, script-used `id`, form `name` and `data-cms` key.
- Legacy token names stay.
- Works without JS.
- Reduced motion respected.

**Scale/Scope**: `styles.css`, `cuenta.html`, `admin.html`, the 3 pages with backup forms, 5 heavy pages (credito, comprar-casa, herramientas, cartas-claras, contrato-auto), `index.html` (component move only), 1 new test file.

## Constitution Check

*GATE: must pass before Phase 0 research, and is re-checked after Phase 1 design.*

| Principle / Rule | Check | Result |
|---|---|---|
| I. Honesty, no advice | The credito sample is labeled "Ejemplo inventado"; no real company or bureau logos; the 7-year note describes the law and cites it, with no "debes" | ✅ |
| II. Privacy | No new data collection; analytics values unchanged (FR-014); the new live region announces a fixed word, never user data | ✅ |
| III. Works without AI | Zyron only gets a color change (header); its local path is untouched | ✅ |
| IV. One truth, tested | The hero's "7 años" figure is checked against the `zyron-leyes.js` FCRA §605 entry (L337–356) by the new test | ✅ |
| V. Multilingual | No new language content; the sample letter stays in English on purpose (it shows the paper the person receives) | ✅ |
| Static, no build, no new dependency | CSS, markup and small JS edits; screenshots use the installed Edge | ✅ |
| Everything in root is published | The new test lives in `tests/` (already blocked); screenshots go to the scratchpad, not the repo | ✅ |
| CSP | Google Fonts is already allowed; the srcdoc iframe inherits the page CSP | ✅ |
| Money code | `pago.js` and payment functions untouched; `.btn-gold` class names stay | ✅ |
| Tests before publishing; never weaken a test | New test written red first; the 25 existing files must stay green | ✅ |
| `graphify update .` after code changes | In each change's done criteria | ✅ |
| Small, single-purpose commits | One commit per change C1–C7 | ✅ |

**Post-design re-check**: ✅ no violations. New things: 2 type tokens, 1 role token, 1 shared component moved from index.html, 1 test file.

## Project Structure

### Documentation (this feature)

```text
specs/012-un-sistema-visual/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R10
├── data-model.md        # tokens, roles, components, inventories
├── quickstart.md        # validation guide
└── contracts/
    ├── ui-rules-v2.md          # additions to 011 ui-rules.md
    ├── paper-hero.md           # .papel-muestra component contract
    └── visual-system-test.md   # tests/sistema-visual.test.js contract
```

### Source Code (repository root)

```text
styles.css                 # C2, C3, C4, C5 (component move)
cuenta.html                # C1 toggles and live region, C2 toggle color
admin.html                 # C1 labels and field types
agendar.html, formar-negocio.html, listar-negocio.html   # C1 hidden forms, autocomplete
contacto.html              # C1 autocomplete; C7 "Escríbeme"
herramientas.html          # C1 autocomplete; C3; C4; C6 iframe
credito.html               # C3, C4, C5 new hero
comprar-casa.html, cartas-claras.html, contrato-auto.html   # C2, C3, C4
index.html                 # C5: hero rules move to styles.css, no visible change
mortgage-calculator.js     # C7 inline error instead of alert()
tests/sistema-visual.test.js   # new (C2 onward)
```

**Structure Decision**: keep the flat static layout. No new folders outside the spec docs.

---

## Change Specifications

Each change below is one commit and can be deployed on its own. The order is also the implementation order (see the end of this section).

### C1. Markup accessibility pack

- **Problem**: keyboard and screen-reader users reach unlabeled fields in 3 visually hidden Netlify backup forms, and can trigger the anti-spam trap. The 3 cuenta toggles have no name. "Guardado ✓" is never announced and is .7rem. Contact and business fields lack `autocomplete`, some email and phone fields are `type=text`, and admin fields have no labels.
- **Objective**: every reachable control has a name and the right type; nothing invisible is reachable.
- **Affected files/components**:
  - backup forms `#agStaticForm` (agendar.html:243), `#fnStaticForm` (formar-negocio.html:495), `#lnStaticForm` (listar-negocio.html:446)
  - cuenta.html:355–366 (toggles and flash), cuenta.html:99 (flash size), cuenta.html:652–653 (flash JS), cuenta.html:330 (phone field)
  - autocomplete: contacto.html:113, 118; formar-negocio.html:394, 398, 402, 410; listar-negocio.html:242, 246, 250, 270, 274; herramientas.html:761, 763, 765
  - admin.html:227 (`clientSearch`), 271 and 275 (`cmstelefono`, `cmscorreo`), 832 (`paBuscar`, `paCorreo`, `paReferencia`, `paServicio`)
- **Proposed solution**:
  - `class="sr-only"` → `hidden` attribute on the 3 backup forms (R3).
  - Toggles get `aria-labelledby` pointing at an `id` on their `.acct-field-value`. Flash spans become empty `role="status"` regions; the JS writes "Guardado" and clears it (R4). Flash size goes to `--text-label`.
  - `autocomplete` values: `name`, `email`, `tel`, `street-address`, `organization`, `postal-code`, `address-level2`. Collector fields in herramientas use `off` (another party's data, not the user's). Email fields → `type="email"`, phone → `type="tel"` with `inputmode="tel"`. `spellcheck="false"` on email fields.
  - Admin search fields get a visible label or `aria-label`; `paServicio` gets a `<label for>`.
- **Implementation requirements**: do not change field `name`s (Netlify form payloads and scripts depend on them). Do not change the backup forms' field lists. Toggle JS keeps `aria-pressed` updates.
- **Responsive requirements**: no layout change. Adding `type=tel`/`email` brings up the right phone keyboard; check on iOS and Android.
- **Accessibility requirements**: WCAG 2.1 AA 1.3.1, 1.3.5 (identify input purpose), 2.1.1, 4.1.2, 4.1.3 (status messages).
- **Acceptance criteria**:
  1. Tab order on agendar, formar-negocio and listar-negocio never enters a backup form (quickstart §1).
  2. NVDA reads the 3 toggles by their visible label and state, and announces "Guardado" once per save.
  3. The HTML scan finds 0 unlabeled reachable controls on the 18 pages.
  4. One live test submission per backup form reaches Netlify Forms after deploy.
  5. The existing `tests/formularios-direccion.test.js` and `tests/cabecera-pie.test.js` still pass.

### C2. Accessibility-critical colors on role tokens

- **Problem**: focus rings use `--gold-light` (1.64:1) or 14%-opacity colors, `outline:none` has no real replacement in 4 places, field borders use `--line` (1.33:1), `--gold` (2.7:1) is used as text, and the cuenta toggle's "on" track is `--gold`. All of this depends on legacy names the admin can overwrite.
- **Objective**: every focus ring, field border, toggle state and accent text reaches its WCAG minimum, whatever an admin picks in the color editor.
- **Affected files/components**:
  - focus: styles.css:379, 414, 462, 481, 828; admin.html:41, 75; cartas-claras.html:84, 117; comprar-casa.html:124
  - `outline:none` without replacement: styles.css:323 (`.tila-field`), 491 (`.auth-country-search`); comprar-casa.html:204 (`.fha-calc-input`, 14% ring); herramientas iframe (handled in C6)
  - field borders on `--line`: styles.css:413, 461; comprar-casa.html:203, 307; contrato-auto.html:149, 158; herramientas.html:37, 64; admin.html:74
  - `--gold` as text: comprar-casa.html:133, 157, 165, 193, 222, 232; aparezco.html:186; agendar.html:46; cartas-claras.html:97; comprar-auto.html:72
  - toggle: cuenta.html:95
- **Proposed solution**:
  - Add `--texto-acento: var(--accion)` to `:root`.
  - Every focus rule uses `var(--focus-ring)` / `var(--focus-color)`, which are already context-aware (styles.css:50–51, 92).
  - `:focus` → `:focus-visible` for non-text controls; text inputs keep `:focus`.
  - Field borders → `--borde-campo`; decorative card borders keep `--line`.
  - `--gold` text on light backgrounds → `--texto-acento`. On dark backgrounds `--gold-light` stays: it passes there, and the test measures it.
  - Toggle on → `--accion`.
  - Mapping tables are in `data-model.md` §2.
- **Implementation requirements**: keep all legacy token definitions and their admin editability (R1). Only the listed uses change. Check each `--gold` text use for background before changing it (dark-context uses stay).
- **Responsive requirements**: none beyond unchanged layout. Rings must not be clipped by `overflow:hidden` parents on ≤720px; check `.talk-card`, `.bento-tile` and `.fha-calc-input`.
- **Accessibility requirements**: WCAG 1.4.11 (non-text contrast ≥3:1), 2.4.7 (focus visible), 1.4.3 (text ≥4.5:1).
- **Acceptance criteria**:
  1. `tests/sistema-visual.test.js` contrast assertions pass (contract §A).
  2. No focus rule references `--gold` or `--gold-light` on a light background.
  3. With an admin override of `--gold` to `#FFFF00` (set temporarily in DevTools), focus rings and field borders do not change.
  4. Keyboard walkthrough of contacto, login, herramientas and comprar-casa shows a ring on every stop.

### C3. Palette leftovers and button shape sweep

- **Problem**: 20 brown or gold values from rejected palettes remain, along with gold gradients, a near-black brown Zyron header, an uppercase gradient pill login button with a brown glow, pill-shaped action buttons, and 91 uppercase label rules.
- **Objective**: every page uses only "Mar en calma" colors and one button shape.
- **Affected files/components**:
  - palette: R5 inventory (credito, cartas-claras, comprar-casa, herramientas, styles.css)
  - buttons: `.auth-cta-btn` (styles.css:430–432), `.talk-actions .btn` (styles.css:236), `.ct-select-btn` and `.ct-camera-btn` (contrato-auto.html:97), the credito upload and "Obtener mis reportes" buttons (located during implementation by the test's button rule)
  - uppercase: all 91 rules. The heaviest are comprar-casa (19), styles.css (15), herramientas (9) and credito (9).
- **Proposed solution**:
  - Apply the R5 mapping table.
  - Every action-button rule uses `border-radius:var(--radius)`, `font-family:var(--font-display)` and sentence case.
  - Pills stay only for chips, tags, badges, progress tracks and the Zyron input field, which are listed as exceptions in `contracts/ui-rules-v2.md`.
  - `text-transform:uppercase` on labels becomes the 011 label style (italic serif eyebrow, or `--text-label` display font in sentence case). Kept only on `aria-hidden` decoration.
- **Implementation requirements**: log every replaced value and its role in `specs/012-un-sistema-visual/color-mapping-log.md`, as in 011. Anything whose role is unclear stays unchanged and is logged as "left as is". Class names do not change (`.btn-gold` and friends stay).
- **Responsive requirements**: button labels that were uppercase get wider or narrower, so check on ≤375px that no button text wraps into 3 lines or overflows (talk card, contrato-auto process pills, login).
- **Accessibility requirements**: button text ≥4.5:1 (white on `--accion`); sentence case improves readability for screen-magnifier users.
- **Acceptance criteria**:
  1. The test's banned-value list returns 0 hits (contract §B).
  2. The test's button rule finds no pill radius on action-button selectors outside the exceptions (contract §C).
  3. 0 `text-transform:uppercase` outside the allow-list (contract §D).
  4. Before/after desktop screenshots of 18 pages: only colors, button corners and label case differ.

### C4. Type scale and one definition per component

- **Problem**: about 800 hard-coded font sizes (30 distinct values, some as small as .55rem); `.btn*` and `.eyebrow*` defined twice in styles.css; pages redefine shared components; index.html repeats shared rules under `body[data-cms-page="index"]` with `!important`.
- **Objective**: every size comes from a token, and each shared component has one definition, so later changes land everywhere at once.
- **Affected files/components**: `styles.css` (all sizes; duplicates at 147–149/879–881 and 154–164/888–896); the `<style>` blocks of credito, comprar-casa, herramientas, cartas-claras and contrato-auto; index.html:168–233.
- **Proposed solution**:
  - Add the R6 tokens and replace sizes by role (mapping table in `data-model.md` §3).
  - Delete the earlier duplicate blocks (R7).
  - Remove per-page redefinitions of `.btn*` and `.eyebrow*`.
  - In index.html, delete each `body[data-cms-page="index"]` rule that only repeats the shared rule, one rule at a time with a screenshot check. Keep the ones that are truly page-specific.
- **Implementation requirements**:
  - Work one file per commit step (styles.css first, then one page at a time, credito first).
  - Take a desktop screenshot before and after each file.
  - No new `!important`.
  - Serif text never below `--text-caption` (14px). `--text-label` (13px) only with `--font-display`.
- **Responsive requirements**:
  - Headings use the clamp tokens, so check 320px, 375px, 768px and 1440px.
  - Body copy lines ≤ 70ch (`max-width:65ch` on text blocks in dark sections of credito and comprar-casa).
  - No horizontal scroll at 320px.
- **Accessibility requirements**: WCAG 1.4.4 (text resizes to 200% without loss); at the 13px and 14px minimums, contrast is still ≥4.5:1 for `--muted` on paper, which the test measures.
- **Acceptance criteria**:
  1. Contract §E: 0 literal `font-size`/`font` sizes in styles.css outside `:root`, and 0 in the 5 listed pages.
  2. Contract §F: `.btn`, `.btn-gold`, `.btn-outline` and `.eyebrow` are each defined once in styles.css and not at all in page `<style>` blocks.
  3. Screenshot review: differences limited to text size, and each difference is listed.
  4. 200% zoom on credito and comprar-casa: no clipped or overlapping text.

### C5. Paper hero on credito (trial)

- **Problem**: the credito hero is an English stock photo with other companies' logos, it has an almost invisible secondary button, and it accents one word ("crédito", "plan" via `.tint-green`, credito.html:342). Three dark blocks run together, so the analyzer, the page's main tool, sits in a dark field.
- **Objective**: credito opens with its own paper (a highlighted report line and a Spanish note), one primary action, and the analyzer on a light background. This tests whether the home page idea works on tool pages.
- **Affected files/components**:
  - index.html:46–78 (hero CSS moves to styles.css as `.papel-muestra`), index.html:298–315 (markup gets the shared class names)
  - credito.html:33–49 (`.cr-hero-bg` slideshow CSS, removed), credito.html:392–420 (hero markup), credito.html:421 (`.cr-analyzer-section` background), credito.html:342 (`.tint-*`, removed)
  - `images/credito-hero-1..4.jpg`, no longer referenced; delete after owner approval
- **Proposed solution**: follow `contracts/paper-hero.md`.
  - The hero keeps its dark `--tinta` band (the site pattern) with the paper sample on the right on desktop, under the copy on mobile.
  - One primary action, "Analizar mi reporte" (`.btn-gold` on dark = white). "Aprender los fundamentos" becomes a text link.
  - The analyzer section and the "Primero, revisa tus tres reportes" band move to paper background with a `--franja-lavanda` top stripe.
  - The headline loses the accent span.
- **Implementation requirements**:
  - Keep `id="analizar-reporte"` (index.html links to `credito.html#analizar-reporte`) and every `data-umami-event` and `data-cms` attribute.
  - The sample is labeled "Ejemplo inventado de un reporte de crédito" and contains no real company or bureau names.
  - The "7 años" figure must match `zyron-leyes.js` (test contract §G).
  - index.html must look the same after the component move (screenshot diff = 0 intended changes).
- **Responsive requirements**:
  - ≤999px: single column, copy then action then sample.
  - ≤560px: the sheet rotation drops to 0°, the note overlaps less (same rules as index.html:75–78), and the sample never forces horizontal scroll at 320px.
  - The hero is no taller than about 1.2 viewports on a 375×812 phone.
- **Accessibility requirements**:
  - The sample is an `<aside>` with `aria-label`, and its English text has `lang="en"`.
  - The highlight uses `<mark>`.
  - The highlight animation is disabled under `prefers-reduced-motion` (the existing rule moves with the component).
  - The secondary text link has ≥4.5:1 on `--tinta`.
  - One `<h1>`.
- **Acceptance criteria**:
  1. Quickstart §5 scenarios pass at 1440, 768, 375 and 320px.
  2. Before/after lists of `data-umami-event` values on credito.html and index.html are identical.
  3. `#analizar-reporte` deep link lands on the analyzer.
  4. Test §G passes.
  5. **Owner approves the trial** before C5 is pushed and before any other page gets the component (SC-007).

### C6. Auto Coach iframe brought into the system

- **Problem**: the herramientas Auto Coach (`srcdoc` iframe at herramientas.html:482) uses its own palette (`#062C60`, `#008B94`), three fonts (Montserrat and Playfair Display, neither loaded, plus fallbacks), 8–9px radii, 12–13px text, `outline:none` with a 14% focus shadow, 1.68:1 field borders and a 135deg gradient.
- **Objective**: it looks and behaves like the rest of the site.
- **Affected files/components**: herramientas.html:482–678 (the `srcdoc` style block and markup; the resize script at 678 stays).
- **Proposed solution**: R10. Map its custom properties to the palette, load Bricolage and Literata inside `srcdoc`, use 6px corners, 14px minimum text, `--borde-campo`-equivalent borders, a 3px focus-visible ring, and a solid surface instead of the gradient.
- **Implementation requirements**: edit the HTML-escaped `srcdoc` carefully (`&quot;`, `&lt;`). Keep every class the simulator script uses. Do not change its calculations.
- **Responsive requirements**: at 375px, go through every simulator step. The iframe height must grow via `frameElement` so nothing is clipped, and there must be no inner horizontal scroll.
- **Accessibility requirements**: every iframe field has a label (to verify during implementation, since the audit scanner could not read inside `srcdoc`); the focus ring is visible; the iframe keeps its `title`.
- **Acceptance criteria**:
  1. Keyboard walkthrough of the simulator shows the ring on every control.
  2. DevTools confirms the fonts load inside the frame.
  3. At 375px, no clipped content at any step.
  4. Calculations give the same results before and after for 3 recorded input sets.

### C7. Minor fixes (batched into the files already touched)

- **Problem / fix list**:

| File | Problem | Fix |
|---|---|---|
| admin.html:150 | h1 → h3 | h3 → h2 |
| credito.html:601 | h2 → h4 | h4 → h3 (check CSS selectors) |
| terminos.html:124 | h2 → h4 | h4 → h3 |
| contrato-auto.html:426 | "Leyendo hojas..." | "Leyendo hojas…" |
| mortgage-calculator.js:68 | `alert()` for the error | inline error next to the save button in a `role="status"` region |
| mortgage-accelerator.js:195–196, tasas-texto.js:91 | hand-formatted numbers | `Intl.NumberFormat('es-US', …)` |
| contacto.html h1 | "Escríbeme" (singular first person) | "Escríbenos" |
| header logo on 18 pages, index.html:478/486/494 | `<img>` without size | add `width`/`height` of the real file; hero images get `fetchpriority="high"`, below-fold ones `loading="lazy"` |

- **Implementation requirements**: the heading changes must keep their visual size (style via class, not tag). The header logo change is in the shared header, so update all 18 pages identically; `tests/cabecera-pie.test.js` enforces this. `tasas-texto.js` changes must keep `tests/tasas-texto.test.js` green without editing expectations, except where the test pins the old format. If it does, stop and ask.
- **Responsive / accessibility requirements**: CLS from the logo is 0; headings are in order; the error is announced.
- **Acceptance criteria**: `node --test tests/` green; the heading-order scan passes; manual check that the mortgage save error appears inline.

### C8. Page-to-page flash and a uniform header (reported by the owner on 2026-09-28)

- **Problem**: the owner sees a visible flash when moving between pages, and a top bar that doesn't look the same on every page (it looked smaller on credito). Each click reloads the whole page, and after the first paint several things change on screen:
  - **Fonts swap**: text first shows in Arial/Georgia and then switches to Bricolage/Literata. The Google Fonts `<link>` uses `display=swap` and the site has no preload or matched fallback.
  - **The account link changes**: auth.js (L93–139) replaces "Iniciar sesión" with the avatar after load, so the menu shifts.
  - **Content arrives late**: cms.js (loaded at the end, after the Supabase CDN, index.html:570–572) rewrites texts, colors and images (cms.js:26, 34, 36) after the page is already visible.
  - **Sections appear**: `[data-reveal]` sections start at `opacity:0` and fade in (styles.css:860–861).
  - **The header takes on what's beneath it**: the bar is translucent (`rgba(255,255,255,.88)` with blur, styles.css:95), so over credito's dark photo it looks gray and different from light pages.
  - **Active item missing**: on pages whose menu item sits inside a dropdown (credito, cartas-claras, contrato-auto, herramientas, comprar-casa, comprar-auto, aparezco, listar-negocio, formar-negocio, agendar), nothing is highlighted in the bar. index, quienes-somos and contacto show a highlighted pill. admin, cuenta, login, privacidad and terminos mark nothing. The `.nav-group-btn.is-active` style exists (styles.css:111), but nav.js never sets it.
  - **Height not measured on the owner's device**: at 1440px the header measures the same on credito and index (about 73px, headless Edge on 2026-09-28). The phone size difference still has to be checked on the owner's device, since headless Edge can't render a true phone width (research R9).
- **Objective**: moving between pages feels like one site. The header never blinks, moves or changes size or color, and the current section is always marked.
- **Affected files/components**: `styles.css` (header, `.nav`, `.brand-logo`, `[data-reveal]`, `@view-transition`), `nav.js` (active group), `auth.js` (account link space), `cms.js` (apply only real changes), the `<head>` of the 18 pages (font loading), the header of admin, cuenta, login, privacidad and terminos (active marker where one applies).
- **Proposed solution**:
  1. **Page transitions**: add `@view-transition{navigation:auto}` to styles.css and `view-transition-name:site-header` to `header`. The bar stays still and only the content crossfades (Chrome/Edge 126+, Safari 18.2+). Browsers without support behave as today. The crossfade is disabled under `prefers-reduced-motion`.
  2. **Fonts**: `<link rel="preconnect">` is already present. Add `rel="preload" as="style"` for the fonts stylesheet, plus metric-matched fallbacks (`@font-face` for "Bricolage fallback" / "Literata fallback" over Arial/Georgia with `size-adjust`, `ascent-override`, `descent-override`) and put them in `--font-display` / `--font-body` right after the web font. The swap then causes no jump.
  3. **Header**: solid white on every page (drop the translucency and blur); fixed height (`.nav{height:72px}` instead of `min-height`, 64px on ≤720px); `.brand-logo` with fixed `width`/`height` (links to C7).
  4. **Account link**: give `#navAuthLink` a fixed width that fits both "Iniciar sesión" and the avatar, so the swap doesn't move the menu.
  5. **Active section**: nav.js adds `is-active` (and `aria-current="page"` on the link) to the `.nav-group-btn` whose menu contains the current page's link. cuenta and login mark the account link; admin, privacidad and terminos stay unmarked on purpose (they're not in the menu).
  6. **cms.js**: write a value only when it differs from what the page already has. Colors saved in the admin panel are also kept in `localStorage` and applied by a small inline `<head>` script before the first paint.
  7. **Reveal**: `[data-reveal]` applies only to content below the first screen. Nothing in the first screen starts invisible.
  8. **Text size**: add `html{-webkit-text-size-adjust:100%;text-size-adjust:100%}` so mobile browsers don't enlarge or shrink text differently on each page.
- **Implementation requirements**:
  - `tests/cabecera-pie.test.js` must stay green. Its normalization already ignores active markers, so extend it to ignore `aria-current`.
  - The inline cms color script is under 1 KB, catches every error, and never blocks rendering if `localStorage` fails.
  - No change to URLs or `data-umami-event`.
  - Works without JS: the header looks the same, and only the active marker depends on nav.js.
- **Responsive requirements**:
  - Header height is identical on all 18 pages at 320, 375, 768 and 1440px (72px desktop / 64px ≤720px).
  - No page is wider than the screen at 320px, so the phone doesn't zoom out and make the header look smaller.
  - Check this in DevTools device mode on credito first.
- **Accessibility requirements**:
  - `aria-current="page"` on the current link (WCAG 2.4.8 helps orientation).
  - Transitions respect reduced motion (2.3.3).
  - The active marker doesn't rely on color alone: use background plus weight, which the existing `.is-active` rule already does.
- **Acceptance criteria**:
  1. Clicking through the 18 pages in Edge and Safari, the bar doesn't blink, move or change color.
  2. DevTools → Performance: the header's layout shift is 0 on every page load. The whole-page CLS is below 0.05 on index, credito and comprar-casa.
  3. The header height measured in DevTools is the same on all 18 pages at each tested width.
  4. On credito, "Tu crédito" is highlighted; on cartas-claras and contrato-auto too; on herramientas, comprar-casa and comprar-auto "Guías" is highlighted; on the business pages "Tu negocio" is highlighted.
  5. With the admin's saved colors, the second visit shows them from the first frame (no color flash).
  6. `node --test tests/` is green.

---

## Implementation Order

| # | Change | Depends on | Risk | Commit / deploy |
|---|---|---|---|---|
| 0 | Before-screenshots of 18 pages (quickstart §0) and a red `tests/sistema-visual.test.js` (§A–§G) | — | none | test file only |
| 1 | **C1** markup accessibility | — | low | deploy; live Netlify form check |
| 2 | **C2** role tokens | 0 | low–medium (admin override check) | deploy |
| 3 | **C3** leftovers and button shape | 2 | low | deploy |
| 4 | **C4** type scale and components: styles.css → credito → comprar-casa → herramientas → cartas-claras → contrato-auto → index.html cleanup | 3 | **medium–high** | one commit per file, screenshots each; deploy after all pass |
| 5 | **C6** Auto Coach iframe | 2 | medium (contained) | deploy |
| 6 | **C5** credito paper hero | 4 | medium | **owner approval before push** |
| 7 | **C7** minor fixes | touched files | low | may ride along with the commit of the file it touches |
| 2b | **C8** page-to-page flash and uniform header (owner report) | C2 for the header colors; independent otherwise | low–medium (cms color cache, 18 `<head>`s) | right after C2, because the owner sees it on every click; deploy |

C1 can ship first even if nothing else does. C5 is last on purpose: it needs C4's clean cascade, or leftover page rules will override the new hero, which is how credito became half-new, half-old. After every step: `node --test tests/`, `graphify update .`, and `git push origin master:main` only with owner approval (deploy memory).

## Complexity Tracking

No constitution violations. Deferred on purpose:

| Deferred item | Why deferred | Simpler choice taken |
|---|---|---|
| Renaming legacy tokens | Admin editor writes them; 765 references | Role tokens for accessibility-critical uses only (R1, R2) |
| Type scale on the other 12 pages | Low traffic of change there; large diff | Test checks only styles.css and the 5 heavy pages; others follow when edited |
| Paper hero on other tool pages | Needs the owner's verdict on the trial | Component is shared, so rollout is markup-only later |
| Rebuilding Auto Coach outside the iframe | No user-visible gain | Restyle in place (R10) |
| Automated phone-width screenshots | Headless Edge ignores narrow widths; Playwright would be a new dependency | Manual DevTools device mode in quickstart |
