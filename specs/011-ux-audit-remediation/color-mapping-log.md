# Color mapping log (T026-T030)

Inline `<style>` colors were mapped to the palette by their role (research R8). White/black and `@media print` rules were left unchanged. Contrast checks: `--corrector` on `--copia-rosa` 4.58:1, `--ink` on `--copia-rosa` 9.77:1, white on `--corrector` 5.23:1.

## index.html (English example letter)
- `.hm-carta` text `#3b4252` → `var(--ink)`; `.hm-membrete strong` `#2b3140` → `var(--ink)` (neutral dark text)
- `.hm-membrete span` `#7b8394`, `.hm-ref` `#5d6577` → `var(--muted)` (secondary text)
- Radii 8/14/16px and `0 12px 12px 0` → `var(--radius)`

## comprar-casa.html
- `.rate-status::before` `#20b875` → `var(--good)` (active state)
- `.rate-status[sin_datos]::before` `#9ca3af` → `var(--muted)` (no data)
- `.fha-world-scroll` gradient `#fbfdff` → `var(--paper)`; `.fha-myth`, `.fha-definition` `#e9f7fd` → `var(--copia-celeste)`
- `.cmp-destacar dd`, `.cmp-aviso h4`, `.cmp-aviso a` `#8a2b2b` and `.cmp-aviso b` `#a34838` → `var(--corrector)` (alert)
- `.cmp-aviso` `#fff0ed` → `var(--copia-rosa)`; `.cmp-aviso p` `#7e3127` → `var(--ink)` (paragraph readability)
- Radii 8/9px → `var(--radius)`
- **Kept**:
  - `#d97706` (amber "sin actualizar" status dot): a real warning state with no amber in the palette.
  - `#8a5a1f` / `#2c5b50` (FHA vs conventional category labels): comparison identity colors, no role match.

## contrato-auto.html
- `--ct-wash-bad` `#fbeeea` → `var(--copia-rosa)`
- `.ct-field input::placeholder` `#7d7163` → `var(--muted)`
- Radius 18px → `var(--radius)`. Print rules and `.hero.hero-dark` untouched.

## credito.html
- `.cr-error`, `.cr-form-alert`: `#fff0ed` → `var(--copia-rosa)`, `#a34838` → `var(--corrector)`, `#7e3127` → `var(--corrector)`
- `.cr-health.critical` `#d67868` → `var(--franja-rosa)`; `.cr-health.stable` `#70b69b` → `var(--franja-verde)`
- `.cr-negative` heads `#8c4034` and `.cr-finding-dot` `#a34838` → `var(--corrector)`
- `.cr-detected-data` `#fffaf0` → `var(--paper-dim)`
- Radii 18/20px → `var(--radius)`
- **Kept**:
  - `.range-seg.r1/r2/r4` (`#a63a26`, `#b8622f`, `#7f9a4c`): credit-score scale from bad to good, a data-viz gradient.
  - `--bureau` `#b32541` / `#982881` / `#0089a8`: Equifax / Experian / TransUnion identity colors.

## cartas-claras.html
- `.cc-scope-chip-alert` `#a3402a` and `.is-detected` `#b3402a` → `var(--corrector)`
- `.cr-error` (same as credito), `.cc-scam-alert` bg → `var(--copia-rosa)`, `b`/`h4` → `var(--corrector)`, `p` → `var(--ink)`
- `.cc-scam-links a` `#a34838` → `var(--corrector)`
- `.cc-badge-urg-alta` `#8a2b2b` → `var(--corrector)`; `.cc-badge-urg-baja` `#31543c` → `var(--good)`
- `.cc-deadline-k`, `.cc-deadline strong` `#8a2b2b` → `var(--corrector)`; `.cc-deadline-aviso` `#6b4a3f` → `var(--muted)`
- `.cc-permiso-lista .no` `#b3402a` → `var(--corrector)`
- Radii 8px, `0 8px 8px 0`, `0 11px 11px 0` → `var(--radius)`
- **Kept**:
  - `.cc-badge-cat` / `.cc-badge-urg-media` `#8a5a20`: medium urgency (amber), no palette match.
  - `.cc-scam-links a:hover` `#8a2b2b`: darker hover of the alert button, no darker red token.
  - `.cc-ico` `#8a6a2f`: role unclear.
  - `var(--navy-deep,#10243b)` and `var(--good,#4f6b57)`: fallbacks only.
