# Contract: `tests/sistema-visual.test.js`

It runs with `node --test tests/`. No dependencies: only `node:fs`, `node:path`, `node:assert` and `node:test`. It follows the style of `tests/cabecera-pie.test.js`.

## Inputs
- `styles.css`
- the `<style>` blocks and `style=""` attributes of every root `*.html`
- `zyron-leyes.js`, for §G

CSS is read as text and split into rules with a small regex tokenizer (selector `{` declarations `}`, with `@media` blocks flattened). There is no CSS parser dependency.

## Assertions

**§A Contrast of role tokens.**
- Resolve `:root` hex values, following `var()` chains one level at a time.
- Compute WCAG relative luminance.
- Assert:
  - `--focus-color` vs `--paper`, `--paper-dim` and `#fff` ≥ 3
  - `--agua` vs `--tinta` ≥ 3
  - `--borde-campo` vs `#fff` ≥ 3
  - `--texto-acento` vs `--paper`, `--paper-dim`, `#fff` and each `--copia-*` ≥ 4.5
  - `--muted` vs `--paper` and `--paper-dim` ≥ 4.5
  - `--accion` toggle track vs `--paper` ≥ 3
- Also assert that no declaration whose property is `outline`/`outline-color`, or whose selector contains `:focus`, references `--gold` or `--gold-light`.

**§B Banned values.** Across all inputs, 0 matches (case-insensitive) for each value listed in `ui-rules-v2.md` › Color roles.

**§C Button shape.** For rules whose selector matches `/(^|[\s.,])(btn|[\w-]*-cta|[\w-]*select-btn|[\w-]*camera-btn)\b/` and is not in the pill allow-list, `border-radius` is absent or is `var(--radius)` / `var(--radius-sm)`.

**§D Uppercase.** 0 `text-transform:uppercase` outside the allow-list. Each allow-list entry is `{selector, file, reason}`.

**§E Type tokens.**
- In `styles.css` outside `:root`, and in the `<style>` blocks of credito, comprar-casa, herramientas, cartas-claras and contrato-auto: every `font-size` value and every size inside a `font:` shorthand is a `var(--text-…)`, `inherit`, a `calc()` over a `--text-` token, or `1em`/`100%`.
- The herramientas iframe `srcdoc` is checked separately: no size below 14px, no Montserrat or Playfair Display.

**§F Single definition.** Each of `.btn`, `.btn-gold`, `.btn-light`, `.btn-outline`, `.btn-outline-dark`, `.eyebrow`, `.eyebrow-dark` as a *bare* selector (not combined with a parent or context selector) appears in exactly one rule in `styles.css`, and in no page `<style>` block.

**§G Legal figure.** If credito.html contains `class="papel-muestra"`, its note contains "7 años", and `zyron-leyes.js` contains an FCRA §605 entry with "7 años".

**§H Backup forms.** In agendar, formar-negocio and listar-negocio, every `<form … data-netlify="true" …>` that has no visible submit button carries the `hidden` attribute and not `class="sr-only"`.

## Failure output
Print the file, the selector (or line) and the offending declaration, for example: `comprar-casa.html › .fha-calc-input:focus-within › outline:3px solid rgba(14,165,233,.14)`.

## Order
Written first, red (step 0). §H turns green with C1; §A–§B with C2 and C3; §C–§D with C3; §E–§F with C4; §G with C5.
