# Contract: `.papel-muestra`, the shared paper sample

This is the home hero's sample (index.html:46–78, 298–315) turned into a shared component in `styles.css`. It is used by index.html (no visible change) and credito.html (C5 trial).

## Markup

```html
<aside class="papel-muestra copia-lavanda" aria-label="Ejemplo de cómo explicamos un reporte de crédito">
  <p class="papel-muestra-rotulo">Ejemplo inventado de un reporte de crédito</p>
  <div class="papel-muestra-hoja">
    <div class="papel-muestra-carta" lang="en">
      <!-- sample document text; exactly one <mark class="papel-muestra-marca"> -->
    </div>
    <div class="papel-muestra-nota">
      <strong><!-- short Spanish title --></strong>
      <p><!-- one or two sentences in Spanish --></p>
    </div>
  </div>
</aside>
```

- The `copia-*` class on the root sets the back-sheet color (`--copia`). index.html keeps `copia-celeste`; credito uses `copia-lavanda`.
- The old `.hm-*` classes are renamed in index.html in the same commit. No alias rules are kept.

## Content rules
- The label always starts with "Ejemplo inventado". No real company, bureau, agency name or logo appears.
- Exactly one `<mark>`, marking the one thing that matters.
- The note describes the law or the fact and names its source. It never says "debes" (constitution I).
- **credito content**:
  - Sample: an invented tradeline, for example "ACME FINANCE · Collection · Balance $1,284 · Date of first delinquency: 03/2021", with the date marked.
  - Note title: "La fecha que cuenta".
  - Note body: says that most negative items can stay on the report up to 7 years from about that date, per the federal FCRA §605, and that the reader should check the date on their own report.
  - The "7 años" figure must match the FCRA §605 entry in `zyron-leyes.js` (L337–356), which the test checks.

## Behavior
- The highlight draws once, 0.7s after load (existing `hm-marcar` keyframes, renamed). The note fades in after it. These are the page's only automatic motion.
- `prefers-reduced-motion: reduce`: highlight shown fully drawn, note visible, no animation.
- Works without JS (pure CSS).

## Layout
| Width | Layout |
|---|---|
| ≥1000px | two columns: copy (≈1.05fr) and sample (≈.95fr, max 470px) |
| 561–999px | one column: copy, actions, then sample centered (max 470px) |
| ≤560px | sheet and note rotations drop to 0°; note overlaps the sheet by 8px; sample width 100% |

- No horizontal scroll at 320px. Sample text uses `--text-caption` (the index.html .7rem and .72rem return-address lines move to `--text-caption` too).

## Accessibility
- `<aside>` with `aria-label`; the English sample has `lang="en"`; `<mark>` for the highlight.
- The sample contains no interactive elements.
- The note's contrast is ≥4.5:1 on white.
