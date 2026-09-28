# Phase 0 Research: UX Audit Remediation

All decisions below come from targeted reads of the current code (2026-09-27). Three audit findings were corrected by this research (R3, R8, R9); the spec was updated to match.

## R1. Footer: one static block, enforced by a test

- **Decision**: Keep the footer as static markup in each of the 17 public pages. Replace the current five variants with one reference block (see `contracts/footer.md`), copied verbatim. A new `node --test` file compares every public page's `<header>` and `<footer>` against `index.html`.
- **Rationale**: Constitution "Sitio estático sin paso de compilación". Static markup works with no JS, is indexed, and needs no new tooling. The test catches drift, which is what caused the five variants.
- **Alternatives considered**: Inject header/footer from `nav.js` (breaks no-JS rendering, flashes on load, SEO loss). Netlify edge includes / build step (new tooling, violates constitution).

## R2. Operator line next to prices: reuse `empresa.js`

- **Decision**: Add one new slot mode to `empresa.js`: `data-empresa="operador"` renders "Operado por {RAZON_SOCIAL}, {ESTADO}" (either part omitted if empty; slot stays hidden if `RAZON_SOCIAL` is empty). Place one `<p class="pago-operador" data-empresa="operador" hidden></p>` right after each `.pago-caja` (formar-negocio L387, listar-negocio L235) and in the price section of `terminos.html`.
- **Rationale**: `empresa.js` already renders `[data-empresa]` slots, hides them when empty, and escapes values. It is about 6 new lines, with no new file and no changes to `pago.js`.
- **Alternatives considered**: Render inside `pago.js` (couples payment code to identity, and payment code carries stricter test requirements).

## R3. Script loading (audit H4 corrected)

- **Finding**: Scripts already sit at the end of `<body>`, so they do not block first paint of the content above them. The real waste: 16 pages load `zyron-leyes.js` (104 KB) and `zyron-brain.js` (81 KB) statically, although `credit-coach.js` already lazy-loads both through `ensureBrain()` (L127-134). No other file uses `ZyronBrain`/`ZyronLeyes` (verified with grep).
- **Decision**: Remove the two static `<script>` tags from all pages. Do NOT add `defer` broadly: several pages have inline scripts that run immediately and rely on globals like `CCAuth`, so a blanket `defer` risks breaking them. Keep `site-search-index.js` (7 KB) static, because `credit-coach.js` reads `window.ThemoraSearch` synchronously.
- **Rationale**: About 185 KB less on every page load with a one-line removal per page. It reuses the existing lazy loader and keeps the local answer path (Constitution III).
- **Alternatives considered**: Adding `defer` everywhere (breakage risk, small gain); bundling (needs a build step).
- **Test impact**: `tests/tasas-paginas.test.js` checks the order nav.js < tasas < analytics.js. Removing the Zyron tags does not affect it.

## R4. Focus ring on dark backgrounds

- **Decision**: Re-scope the existing token `--focus-color` to `var(--agua)` inside `.page-hero, .band-dark, .bento-tile--dark, footer, .hero-dark, .tasas-aviso`. Contrast: `--agua` on `--tinta` 6.93:1 and on `#0E3240` 8.27:1.
- **Rationale**: The global rule already reads `var(--focus-ring)`, so one CSS rule fixes every dark context. `.tasas-aviso` already uses this pattern locally.

## R5. Label minimum and dim text

- **Decision**: Raise these 7 rules to `.75rem` (about 14.2px at the 118% root size): `styles.css` L176, L194, L271, L279 (legend), L306, L311, L313, L316. Raise `.hero-stat span` opacity from .55 to .72.
- **Rationale**: These are the only sub-.62rem labels in `styles.css`. Inline pages use `px` sizes and are checked in quickstart step 3 instead of being edited blindly.

## R6. Contrast tokens

- **Decision**: Add `--borde-campo:#6E8890` (measured 3.54:1 on `#F5F9F9`, 3.76:1 on `#FFFFFF`, 3.24:1 on `--copia-celeste`). Apply it to `input, select, textarea` borders only. Logged-in account button: background `--accion` with white text (6.37:1) instead of `--gold` (#5FA8B8) with tinta text (about 4.2:1).
- **Rationale**: Dividers keep the light `--renglon`; only UI controls need 3:1.

## R7. Shape system through tokens

- **Decision**: In `:root`, set `--radius:6px; --radius-sm:4px; --radius-lg:6px; --radius-xl:6px; --radius-2xl:6px`, keep `--radius-pill` for chips and `50%` for avatars and the launcher. Then fix the literal-radius holdouts in `styles.css` (`.agent-card`, `.talk-card` and its media queries L227/L231, `.refresh-btn`) and set the `.profile-avatar` fill from `--gold` to `--copia-celeste` with tinta text.
- **Rationale**: Most legacy components use the tokens, so they inherit the rule. The inline `px` radii in pages (8px ×28, 20px ×5, and others) are normalized in the same pass as R8.

## R8. Inline colors (audit H3 corrected)

- **Finding**: In the five heaviest pages only 2 of 186 inline hex values equal a palette color. The rest are white/black (111) or off-palette (73), mostly warm reds (`#8a2b2b`, `#a34838`, `#7e3127`), cool grays (`#3b4252`, `#7b8394`) and Tailwind-like values (`#20b875`, `#d97706`, `#9ca3af`).
- **Decision**: Map by meaning, not by value: error/alert reds → `var(--corrector)`; neutral text grays → `var(--ink)`/`var(--muted)`; success greens → `var(--good)`; warm tint backgrounds → `var(--copia-rosa)`; amber warnings → `var(--resaltador)` family. White/black stay. Print-only rules stay unchanged. Any value without a clear meaning is listed in the PR, not changed.
- **Rationale**: This removes the "other palette" feeling without a CSS move. It is a value-only change inside existing blocks.

## R9. Floating layers (audit M4 corrected)

- **Finding**: The rate notice (`.tasas-aviso`) and the talk card (`.talk-strip`) are already in the page flow. The only extra fixed element is `.casas-flotantes` on comprar-casa (fixed bottom-left, z 140), next to the launcher (bottom-right, z 200).
- **Decision**: On ≤720px, render `.casas-flotantes` in the flow (`position:static`) and hide the launcher while a text field inside `main` has focus (`body:has(main :is(input,textarea,select):focus) .credit-coach-launcher{display:none}` in CSS, with no JS).
- **Rationale**: This is the smallest change. `:has()` is supported by all current mobile browsers; where it is missing, current behavior simply stays.

## R10. contrato-auto alignment (audit M2 narrowed)

- **Finding**: Its header differs from the reference only by the missing `login.html` link. Its hero (`.hero.hero-dark`) already gets the green stripe from `styles.css` L906-908.
- **Decision**: Add the missing account link only. Keep its custom hero (scanner animation, print rules). Do not change it to `.page-hero`.

## R11. Homepage CTA and heading

- **Decision**: Move `<a data-umami-event="inicio-negocio" href="aparezco.html">` from the hero (L290) into the business band (L430+) as `.btn-gold` (white on dark via the existing rule). Replace the inline style on L417 with `class="section-head"` markup.

## R12. Other small items

- `noindex` meta on `cuenta.html`, `login.html`.
- Mobile menu: `.nav-toggle` to 44×44; in the ≤720px block make `.nav-group-btn` non-interactive looking (`pointer-events:none`, heading-style color). An `aria-expanded` button without behavior is misleading on mobile, so add `tabindex="-1"` via `nav.js` only on narrow screens. If that grows beyond a few lines, keep the CSS change only.
- Delete `media/cartas-fondo.mp4` and `media/cartas-fondo-poster.jpg` (no references in html/js/css).
- Out of scope, recorded: dark mode, em-dash (raya) style, moving inline CSS into `styles.css`, `admin.html`.
