# Phase 0 Research: One Visual System

Every decision below was checked against the code on 2026-09-28. Line numbers refer to that state.

## R1. Legacy token names stay (no renaming)

- **Decision**: keep `--gold`, `--gold-light`, `--navy`, `--navy-deep`, `--teal`, `--sky` and `--line` as they are. Fix only how they are *used* in accessibility-critical roles.
- **Rationale**: the admin color editor writes these exact names at runtime (admin.html:587–591 defines them; `cms.js:26` applies them with `setProperty`). They are a live interface. They are also referenced 765 times across 19 files, so renaming them is a large diff with no visible gain. Spec 011 made the same call (plan "Complexity Tracking").
- **Alternatives considered**: rename everything to Spanish role names (rejected: breaks saved admin colors and touches every page); remove the aliases (rejected: same).

## R2. Accessibility-critical roles get their own tokens that the admin editor cannot change

- **Decision**: focus rings read `--focus-color` (it already exists, styles.css:50, and switches to `--agua` in dark contexts at styles.css:92). Field borders read `--borde-campo`. Accent text on light backgrounds reads a new `--texto-acento: var(--accion)`. Nothing in these roles reads `--gold` or `--gold-light`.
- **Rationale**: `--gold-light` is #9FD3DB (1.64:1 on white) and `--gold` is #5FA8B8 (2.7:1). Contrast should not depend on what an admin picks in a color editor. Admin edits keep changing decoration (accents, dots, bars), which is what the editor labels describe ("acentos, puntos, bordes").
- **Alternatives considered**: darken `--gold` itself (rejected: it is also used on dark backgrounds, where it works, and the admin can overwrite it anyway).

## R3. The backup forms use the `hidden` attribute

- **Decision**: replace `class="sr-only"` with the `hidden` attribute on `#agStaticForm`, `#fnStaticForm` and `#lnStaticForm`.
- **Rationale**: `sr-only` hides content only visually, so keyboards and screen readers still reach it. `hidden` removes it from rendering, the tab order and the accessibility tree. Netlify detects forms by parsing the deployed HTML, and Netlify's documentation for JavaScript-rendered forms uses a static form with the `hidden` attribute. The contacto form is unaffected, since it is the real visible form and its honeypot sits in a `display:none` paragraph.
- **Verification**: one test submission per form on the live site after deploy (quickstart §1). Constitution rule: never report success without evidence.
- **Alternatives considered**: `aria-hidden` plus `tabindex=-1` on every field (rejected: more markup, easy to miss one).

## R4. The toggles are named by their visible labels, and saves are announced by writing text

- **Decision**: give each `.acct-field-value` an `id` and point the toggle at it with `aria-labelledby`. Make each `.acct-saved-flash` a `role="status"` region that starts empty. The JS at cuenta.html:652 writes "Guardado" into it and clears it after the existing 1400ms, instead of only toggling a class.
- **Rationale**: live regions announce changes to their text, not to opacity. Today the text is always present, so nothing is announced. The toggle "on" track uses `--gold` (cuenta.html:95), which is 2.7:1 against the paper background. It moves to `--accion` so the on/off state reaches 3:1.
- **Alternatives considered**: `aria-label` strings (rejected: they duplicate the visible text and drift apart).

## R5. Mapping the old palette leftovers by what they do

- **Decision**:

| Leftover | Role | Replacement |
|---|---|---|
| `rgba(201,138,62,a)` shadows or glows | shadow | `rgba(18,63,79,a)`, the `--tinta` base that `--shadow` already uses |
| `rgba(184,134,59,.14)` and similar tint backgrounds | tint | `var(--copia, var(--copia-celeste))` |
| `linear-gradient(135deg,var(--gold-light),var(--gold))` on buttons | button surface | solid `var(--accion)` with white text |
| the same gradient on icons/avatars (comprar-casa.html:35, styles.css:661) | decorative surface | `var(--copia, var(--copia-celeste))` with `--tinta` text |
| `#171008` in the Zyron header (styles.css:390) | dark surface | `var(--tinta)`, solid, no gradient |
| `.auth-cta-btn` (styles.css:430–432) | primary action | the `.btn-gold` rule: 6px, Bricolage, sentence case, no glow |

- **Rationale**: this is the same method spec 011 used for inline colors (`color-mapping-log.md`). Anything unclear stays unchanged and gets logged.
- **Inventory** (from the audit): credito.html:88, 112, 170; cartas-claras.html:52, 71, 97, 127, 129; comprar-casa.html:35, 64, 326; herramientas.html:90, 113, 494; styles.css:231, 390, 430, 432, 661, 662.

## R6. Type scale: reuse the existing tokens and adjust two values

- **Decision**: use the `--text-*` tokens that already exist (styles.css:56–63; nothing references them today, so changing them is safe). Add two small steps and fix one value:

| Token | Value | Use |
|---|---|---|
| `--text-label` (new) | .8125rem (13px) | UI labels, chips, badges, in `--font-display` only |
| `--text-caption` (new) | .875rem (14px) | captions, help text, fine print, card body copy |
| `--text-body-sm` | .875rem, changed from .85 | alias of caption, kept for compatibility |
| `--text-body` | 1rem | body text |
| `--text-body-lg` | 1.125rem | intro paragraphs |
| `--text-subheading` | 1.5rem | card and step titles |
| `--text-heading-sm` | 2rem | h2 inside tools |
| `--text-heading` | clamp(2rem,4vw,3.25rem) | section h2 (current `.section-head h2` value) |
| `--text-display` | clamp(2.4rem,5.2vw,4rem) | page h1 (current home value) |

- `--text-heading-lg` stays as it is but is unused. No new sizes below 13px, and 13px only in the display font. Serif text never goes below 14px.
- **Rationale**: the synthesis found about 800 hard-coded sizes across 30 distinct values between .55 and 1.1rem. Nine steps cover every real use. The 13px floor meets the 011 rule of ≥.75rem, and 14px serif fixes the "small muted Literata" problem.
- **Scope**: `styles.css` fully, plus the pages that change 4 touches (credito, comprar-casa, herramientas, cartas-claras, contrato-auto). The other pages follow when they are next edited, so the test only checks the listed files.

## R7. One definition per shared component

- **Decision**: merge the two `.btn*` blocks (styles.css:154–164 and 888–896) and the two `.eyebrow*` blocks (147–149 and 879–881) into the later ("Mar en calma") version, and delete the earlier one. Delete per-page redefinitions of `.btn*` and `.eyebrow*` from `<style>` blocks, and the index.html `body[data-cms-page="index"]` rules that only repeat what the shared rule now says (index.html:171–233, reviewed one rule at a time).
- **Rationale**: while the earlier block exists, any rule the later one forgets to override leaks through. That is how pill buttons and uppercase labels survived spec 011.
- **Risk control**: before/after screenshots (R9) and the consistency test.

## R8. The paper hero becomes a shared component, tried on credito only

- **Decision**: move `.hm-hoja`, `.hm-carta`, `.hm-marca`, `.hm-nota` and `.hm-rotulo` (index.html:46–78) into styles.css as a `.papel-muestra` component, with the same markup contract and a `--copia` sheet color. index.html uses the shared component, with no visible change. credito.html gets a new hero built from it (see `contracts/paper-hero.md`) in place of the stock photo.
- **Sample content for credito**: an invented report line in English ("ACME FINANCE — Collection — Balance $1,284 — Date of first delinquency 03/2021") with the date highlighted. The Spanish note explains that negative items generally stay up to 7 years from that date, with the source cited (FCRA §605, already cited in the site's legal files).
- **Honesty (constitution I)**: labeled "Ejemplo inventado" like the home sample. No real bureau logos or company names.
- **Rationale**: it reuses a proven, accessible piece (reduced-motion support already exists at index.html:71–74) instead of creating a new one.

## R9. Visual regression safety net without new dependencies

- **Decision**: capture before/after screenshots with the installed Microsoft Edge in headless mode: `--headless=new --window-size=1440,3600 --screenshot` for desktop. For phone width, headless Edge renders a wider layout than 390px (seen on 2026-09-28: header toggle missing and content cropped), so phone checks use Edge DevTools device mode at 375×812, done by hand, and are listed in the quickstart.
- **Rationale**: the constitution forbids new dependencies without evidence. Playwright is not installed in the project. Headless Edge worked this session.
- **Alternatives considered**: Playwright (rejected: new dependency), no screenshots (rejected: the synthesis rated R7 as the riskiest change).

## R10. Auto Coach iframe: restyle in place

- **Decision**: keep the `srcdoc` iframe and its `frameElement` resize script (herramientas.html:678). Inside its `<style>`:
  - point the `#fc-auto-simulator` custom properties at the site palette values (`--navy:#123F4F`, `--teal:#17687A`, `--line:#6E8890` for field borders, `--muted:#566A72`)
  - replace Montserrat and Playfair Display with the site fonts (add the same Google Fonts `<link>` inside `srcdoc`, because an iframe does not inherit fonts)
  - change radii 8–9px to 6px and 12–13px text to 14px
  - replace `outline:none` with a 3px `--teal` focus-visible ring
  - remove the 135deg gradient (herramientas.html:494)
- **Rationale**: rebuilding it outside the iframe is a larger, riskier change with no user-visible gain. Srcdoc frames are same-origin, so the resize keeps working. The CSP already allows Google Fonts on the parent page; the iframe inherits the page's CSP.
- **Check**: the fixed `height:420px` is only a starting value, and the script grows it. Verify at 375px that nothing is clipped after each step of the simulator.
