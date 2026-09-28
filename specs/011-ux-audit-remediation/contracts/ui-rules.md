# Contract: Site-wide UI rules

These are the rules the implementation must satisfy and reviewers check against.

## Shape
| Element | Corner |
|---|---|
| Cards, tiles, panels, menus, inputs, buttons, notices | 6px (`--radius`) |
| Small inner elements (menu items, tags inside inputs) | 4px (`--radius-sm`) |
| Chips / tags / pills that are labels | `--radius-pill` |
| Avatars, assistant launcher, close "×" circles | 50% |

No other literal radius values in `styles.css` or in the inline styles of the five heaviest pages.

## Focus
- Light contexts: 3px `--accion` ring, offset 2px (unchanged).
- Dark contexts (`.page-hero`, `.band-dark`, `.bento-tile--dark`, `.hero-dark`, `footer`, `.tasas-aviso`): 3px `--agua` ring.
- Every focus ring ≥3:1 against its adjacent background.

## Text size and contrast
- Meaningful labels ≥ .75rem (≈14px). Decorative-only text is exempt only if `aria-hidden`.
- Text ≥4.5:1; large text (≥24px, or ≥18.7px bold) ≥3:1.
- `--franja-*` colors are never used for text.
- Input/select/textarea borders use `--borde-campo` (≥3:1).

## Touch targets (≤720px)
- Menu toggle, footer links, launcher, close buttons: ≥44×44px.

## Floating layers
- Only the assistant launcher may be `position:fixed` over content on ≤720px.
- The launcher is hidden while a field inside `main` has focus on ≤720px.
- Rate notice and talk card stay in the page flow (already true).

## Calls to action
- One primary (`.btn-gold`) action per hero. Secondary actions use `.btn-outline` or text links.
- Analytics attribute values (`data-umami-event`) never change when an element moves.
