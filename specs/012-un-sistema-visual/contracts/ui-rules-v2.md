# Contract: Site-wide UI rules, v2

This extends `specs/011-ux-audit-remediation/contracts/ui-rules.md`. The 011 rules still apply; below are additions and clarifications. `tests/sistema-visual.test.js` enforces the rules marked 🧪.

## Color roles
- 🧪 Focus indicators use `var(--focus-ring)` or `var(--focus-color)`, never `--gold` or `--gold-light`.
- 🧪 `outline:none` / `outline:0` is allowed only when the same selector (or its `:focus-visible` / `:focus-within` variant) sets an outline or a box-shadow of ≥2px using a role token.
- 🧪 Text inputs, selects and textareas use `--borde-campo` for their border.
- 🧪 `color:var(--gold)` is not used. Light backgrounds use `--texto-acento`; dark backgrounds use `--gold-light`.
- 🧪 Banned values: `rgba(201,138,62,…)`, `rgba(184,134,59,…)`, `#171008`, `linear-gradient(135deg,var(--gold-light),var(--gold))`, `Montserrat`, `Playfair Display`.
- Admin-editable aliases (`--gold`, `--gold-light`, `--navy`, `--navy-deep`, `--teal`) are for decoration and brand surfaces only.

## Shape
- 🧪 Action buttons (selectors containing `btn`, `-cta`, `select-btn` or `camera-btn`, or `button` rules that are not chips) use `var(--radius)`.
- Pill radius (`--radius-pill` / 999px) is allowed only for: chips and tags (`*-chip`, `*-pill`, `*-badge`, `.saved-item-meta span`), progress tracks and fills (`*-track`, `*-fill`, `*-barra`), `.coach-suggestion`, `.credit-coach-input`, `.acct-toggle`, and `.ct-process` (a step indicator, not a button).

## Type
- 🧪 No `text-transform:uppercase`, except on elements that are `aria-hidden="true"`. Allow-list is kept in the test file with a reason per entry.
- 🧪 In `styles.css` (outside `:root`) and in credito, comprar-casa, herramientas, cartas-claras and contrato-auto, font sizes come from `--text-*` tokens.
- Serif (`--font-body`) text is never smaller than `--text-caption` (14px). `--text-label` (13px) is used only with `--font-display`.
- Headlines never color a single word differently. The highlighter (`<mark>` / `--resaltador`) is the only word-level emphasis, and only for "lo que importa".
- Text blocks on dark backgrounds are capped at `max-width:65ch`.

## Components
- 🧪 `.btn`, `.btn-gold`, `.btn-light`, `.btn-outline`, `.btn-outline-dark`, `.eyebrow` and `.eyebrow-dark` are defined once, in `styles.css`, and not redefined in page `<style>` blocks.
- One primary (`.btn-gold`) action per hero. Secondary actions are `.btn-outline` on light backgrounds, or a text link on dark ones.
- Dark (`--tinta`) backgrounds: at most one dark band before the page's main tool. The tool itself sits on a light background.

## Preserved interfaces (never change)
`data-umami-event` values, URLs and anchors (e.g. `#analizar-reporte`), `id`s used by scripts, form and field `name`s, `data-cms` keys, class names used by JS.
