# Implementation Plan: UX Audit Remediation (Trust, Accessibility, Consistency)

**Branch**: `011-ux-audit-remediation` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-ux-audit-remediation/spec.md`

## Summary

Fix everything the visual/UX audit found, reusing what already exists: the `empresa.js` identity slots, the `--focus-ring` / `--radius*` tokens, the lazy loader already built into `credit-coach.js`, and the existing `node --test` suite. The work is mostly value changes in `styles.css :root`, one shared footer block copied into 17 pages, removing two script tags per page, and one new consistency test. There is no new dependency, no build step and no runtime injection.

Research corrected three audit findings (see `research.md` R3, R8, R9), which makes the work smaller than the audit suggested:
- The scripts are already at the end of the page. The real performance gain is not loading 185 KB of assistant files that are already lazy-loaded.
- Only 2 inline colors match the palette. The real fix is mapping about 73 off-palette colors to their meaning.
- The rate notice and talk card already sit in the page flow. Only `comprar-casa` has an extra floating element.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES2017+), no framework

**Primary Dependencies**: None new. Existing: Supabase JS (CDN), Google Fonts, Umami analytics

**Storage**: N/A (identity values live as constants in `empresa.js`)

**Testing**: `node --test tests/` (built-in Node test runner), plus the manual steps in `quickstart.md`

**Target Platform**: Static site on Netlify (`publish = "."`), current evergreen browsers, mid-range Android and iOS Safari

**Project Type**: Static multi-page website

**Performance Goals**: About 185 KB less JavaScript per page load; no regression in first paint

**Constraints**: No build step; LF line endings; URLs, nav labels, form field names and `data-umami-event` values unchanged; works without JS

**Scale/Scope**: 17 public pages plus `styles.css`, `empresa.js`, `nav.js`; about 12 files touched meaningfully, and 17 footers replaced

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle / Rule | Check | Result |
|---|---|---|
| I. Honesty, never promise what doesn't exist | Identity renders only when the owner fills it; no placeholders; the "no somos" copy is reused, not invented | ✅ |
| II. Privacy by design | No new data collection; analytics events unchanged | ✅ |
| III. Works without AI | The assistant keeps its local answer path; lazy loading already exists and resolves `false` on failure (`credit-coach.js` L127-134, L287-290) | ✅ |
| IV. One truth, tested | Header and footer get a single reference plus an automated test | ✅ |
| V. Multilingual | No language content changes | ✅ |
| Static site, no build, no new dependency | Pure markup, CSS and small JS edits | ✅ |
| Everything in root is published | New file goes in `tests/` (already blocked in `netlify.toml`) | ✅ |
| CSP | No new external service | ✅ |
| Money code needs payment tests | `pago.js` is **not** changed; the operator line is rendered by `empresa.js` | ✅ |
| Small, single-purpose commits | One commit per phase (see Implementation Order) | ✅ |
| `graphify update .` after code changes | Included in the done criteria | ✅ |

**Post-design re-check**: ✅ No violations. The design adds one `empresa.js` mode, one test file, and one CSS token; nothing else is new.

## Project Structure

### Documentation (this feature)

```text
specs/011-ux-audit-remediation/
├── spec.md
├── plan.md              # this file
├── research.md          # R1-R12 decisions
├── data-model.md        # identity fields, slot modes, token changes
├── quickstart.md        # validation guide
├── contracts/
│   ├── footer.md
│   ├── ui-rules.md
│   └── consistency-test.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
styles.css                  # tokens, focus, labels, borders, radius, footer grid, mobile menu, floating rule
empresa.js                  # + "operador" slot mode
nav.js                      # (optional) tabindex on mobile group labels
index.html                  # reference header/footer; hero CTA move; section heading
contrato-auto.html          # + account link in header
formar-negocio.html, listar-negocio.html, terminos.html   # + operador slot
cuenta.html, login.html     # + noindex
comprar-casa.html           # .casas-flotantes static on mobile; inline colors
credito.html, cartas-claras.html                           # inline colors
all 17 public *.html        # shared footer; remove zyron-brain/zyron-leyes <script>
tests/cabecera-pie.test.js  # new
media/cartas-fondo.mp4, media/cartas-fondo-poster.jpg      # delete
```

**Structure Decision**: Keep the existing flat static-site layout. No new folders apart from the spec docs.

## Implementation Order

Each phase is one commit, testable and deployable on its own through `git push origin master:main`.

| # | Phase | Changes | Files | Verify |
|---|---|---|---|---|
| 1 | **Trust** | Shared footer (contract), footer grid CSS, `#footerContact` inline style → CSS, `operador` slot mode and 3 slots, noindex, new consistency test | 17 html, `styles.css`, `empresa.js`, `tests/cabecera-pie.test.js` | quickstart §1 |
| 2 | **Accessibility** | `--agua` focus in dark contexts; 8 label rules to .75rem; hero-stat opacity; `--borde-campo` on fields; account button to `--accion`/white; menu toggle 44px; mobile group labels non-interactive | `styles.css` (+ `nav.js` optional) | quickstart §2-3 |
| 3 | **Performance** | Remove static `zyron-brain.js` / `zyron-leyes.js` tags; delete unused media | 16 html, `media/` | quickstart §4, `node --test` |
| 4 | **Shape system** | Radius tokens to 6/4px; fix literal radii in `styles.css`; avatar fill to `--copia-celeste` | `styles.css` | quickstart §5a-c |
| 5 | **Consolidation** | Map about 73 off-palette inline colors by meaning (R8) and normalize inline radii to tokens in the 5 heavy pages; contrato-auto account link; homepage section heading class | 5 html | quickstart §5a, visual diff |
| 6 | **Focus and polish** | Move "Tengo un negocio" to the business band; `.casas-flotantes` static on ≤720px; hide launcher while a field has focus | `index.html`, `comprar-casa.html`, `styles.css` | quickstart §6 |

**Parallel owner task**: fill `empresa.js` and `whatsapp.js` with the real legal identity and contact details. Phase 1 ships correctly with or without them.

**Risk notes**
- Phase 4 changes how every card looks at once. Review screenshots of all 17 pages before pushing.
- Phase 5 changes colors by meaning. List every off-palette value and its replacement in the commit message; anything unclear stays unchanged.
- Phase 1 replaces 17 footers. The new test is the safety net, so write it first (red), then update the pages (green).

## Complexity Tracking

No constitution violations. Deferred on purpose, to keep changes minimal:

| Deferred item | Why deferred | Simpler choice taken |
|---|---|---|
| Renaming legacy tokens (`--gold`, `--navy`, `.btn-gold`) | Touches every page and gives no visible gain | Keep names; change only values and uses |
| Moving about 2,200 lines of inline CSS into `styles.css` | Large diff and high regression risk | Normalize colors and radii in place |
| Header/footer runtime injection | Breaks no-JS rendering and SEO | Static copies plus a consistency test |
| Blanket `defer` on scripts | Inline scripts depend on synchronous globals | Remove only the 185 KB of already-lazy files |
| Dark mode | Brand choice (paper metaphor) | Out of scope |
