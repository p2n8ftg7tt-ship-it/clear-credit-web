# Data Model: One Visual System

This feature stores no data. Its "entities" are design tokens, shared components and the inventories of things that change.

## 1. Tokens

### 1a. Base palette (unchanged)

`--tinta` #123F4F · `--accion` #17687A · `--agua` #9FD3DB · `--resaltador` #FFE27A · `--corrector` #C7372F · `--renglon` #D3E2E4 · `--paper` #F5F9F9 · `--paper-dim` #EAF3F3 · `--ink` #2C3E46 · `--muted` #566A72 · `--borde-campo` #6E8890 · `--good` #2F7A55 · the four `--copia-*` / `--franja-*` pairs.

### 1b. Legacy aliases (kept, admin-editable)

| Alias | Default target | Written by admin editor | Allowed uses after this feature |
|---|---|---|---|
| `--gold` | `--franja-celeste` | yes (admin.html:587) | decoration: dots, bars, stripes, borders that are not field borders; never text on light, never focus |
| `--gold-light` | `--agua` | yes (588) | text and details on dark backgrounds only; never focus |
| `--navy` | `--accion` | yes (589) | unchanged |
| `--navy-deep` | `--tinta` | yes (590) | unchanged |
| `--teal` | `--accion` | yes (591) | unchanged |
| `--line` | `--renglon` | no | card and divider borders; never text-field borders |

### 1c. Role tokens (not admin-editable)

| Token | Value | Role | Validation |
|---|---|---|---|
| `--focus-color` / `--focus-ring` | `--accion`; `--agua` in dark contexts (existing) | every focus indicator | ≥3:1 vs adjacent background |
| `--borde-campo` | #6E8890 (existing) | text input, select and textarea borders | ≥3:1 vs field background |
| `--texto-acento` (new) | `var(--accion)` | accent text on light backgrounds | ≥4.5:1 vs `--paper`, `--paper-dim`, white and each `--copia-*` |

### 1d. Type scale (R6)

`--text-label` .8125rem (display font only) · `--text-caption` .875rem · `--text-body-sm` .875rem · `--text-body` 1rem · `--text-body-lg` 1.125rem · `--text-subheading` 1.5rem · `--text-heading-sm` 2rem · `--text-heading` clamp(2rem,4vw,3.25rem) · `--text-display` clamp(2.4rem,5.2vw,4rem)

## 2. Color use mapping (C2)

| Current use | Context | New value |
|---|---|---|
| `outline: … var(--gold-light)` on `:focus` | light | `var(--focus-ring)` |
| `outline: … var(--gold-light)` in `.tasas-aviso`, `.credit-coach-launcher` | dark | `var(--focus-ring)` (resolves to `--agua` there) |
| `outline:none` + background-only change (`.tila-field`, `.auth-country-search`) | light | keep background change, add `:focus-visible{outline:var(--focus-ring);outline-offset:2px}` |
| `outline:3px solid rgba(14,165,233,.14)` (`.fha-calc-input:focus-within`) | light | `outline:var(--focus-ring)` |
| `border: … var(--line)` on inputs, selects, textareas | any light | `border-color: var(--borde-campo)` |
| `color: var(--gold)` | light | `var(--texto-acento)` |
| `color: var(--gold)` | dark | `var(--gold-light)` (passes on `--tinta`) |
| `.acct-toggle.is-on{background:var(--gold)}` | light | `var(--accion)` |

## 3. Font size mapping (C4)

| Current values | Role | Token |
|---|---|---|
| .55–.72rem, 9–11px | labels, kickers, badges | `--text-label` + `--font-display` (never serif) |
| .74–.9rem, 12–14px | captions, help, fine print, card body | `--text-caption` |
| .92–1.04rem, 15–16px | body | `--text-body` |
| 1.05–1.2rem, 17–19px | lead text, small titles | `--text-body-lg` |
| 1.22–1.7rem, 20–27px | card, step and panel titles | `--text-subheading` |
| 1.9–2.4rem | numbers and tool h2 | `--text-heading-sm` |
| section and page headings with clamp | h2 / h1 | `--text-heading` / `--text-display` |

A value that falls between steps goes to the nearer step. If the visual difference matters (e.g. a large stat number), the rule may use `calc(var(--text-heading-sm) * 1.2)`, and that exception is logged.

## 4. Components

| Component | Defined in (after) | Used by | Notes |
|---|---|---|---|
| `.btn`, `.btn-gold`, `.btn-light`, `.btn-outline`, `.btn-outline-dark` | styles.css, once | all pages | 6px, display font, sentence case; on dark: `.btn-gold` is white |
| `.eyebrow`, `.eyebrow-dark` | styles.css, once | all pages | italic serif, sentence case |
| `.papel-muestra` (new name for `.hm-*`) | styles.css | index.html, credito.html | contract in `contracts/paper-hero.md` |
| `.copia-*` | styles.css (existing) | cards, heroes | sets `--copia` / `--franja` |
| Backup form | each page | Netlify build | `hidden` attribute, fields unchanged |
| Status region | cuenta.html | toggles | `role="status"`, empty until a save |

## 5. State: cuenta toggle (C1)

```
off --click--> saving (disabled) --ok--> on  + status "Guardado" (1400ms) --> status ""
                                 --error--> off + existing error handling (unchanged)
on  --click--> saving --ok--> off + status "Guardado" …
```

`aria-pressed` reflects on/off. A `.acct-toggle:disabled` style exists (cuenta.html:97). Confirm during implementation whether `toggleAndSave` disables the button while saving, and keep whatever it does.
