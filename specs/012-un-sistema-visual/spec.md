# Feature Specification: One Visual System (UX and visual audit follow-up)

**Feature Branch**: `012-un-sistema-visual`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Convert the approved audit findings into a precise implementation specification." Sources: the web-interface audit, the visual design review and the synthesis of 2026-09-28 (in this session). Spec 011 set the rules; this spec enforces them and retires what spec 011 left underneath.

## Background

Spec 011 wrote the site's UI rules (`specs/011-ux-audit-remediation/contracts/ui-rules.md`) but mostly changed token values. The older rules underneath stayed, so the same problems keep coming back. The synthesis traced about 40 findings to four root causes:

- **R1**: new styles were layered on top of old ones instead of replacing them.
- **R2**: pages carry their own `<style>` blocks instead of using shared components.
- **R3**: legacy token names (`--gold`, `--gold-light`) hide their real color, so rules that look safe render at low contrast.
- **R4**: the "paper + highlighter" idea lives only on the home page.

A fifth group is local markup accessibility bugs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keyboard and screen-reader users can complete every form (Priority: P1)

A person who uses a screen reader or only a keyboard can go through the appointment, business-formation and business-listing pages without landing on invisible, unlabeled fields. They can name every control in their account settings and hear when a setting is saved.

**Why this priority**: today some of these people are blocked. Worse, their form submissions can be marked as spam because they fill in the hidden anti-spam field.

**Independent Test**: Tab through agendar, formar-negocio, listar-negocio and cuenta with a screen reader (NVDA or VoiceOver) running. No unlabeled field is reached, all 3 toggles have names, and "Guardado" is announced.

**Acceptance Scenarios**:

1. **Given** agendar.html is open, **When** the user presses Tab from the last visible field, **Then** focus never enters the Netlify backup form.
2. **Given** cuenta.html, **When** focus reaches the email alerts toggle, **Then** the screen reader says "Alertas por correo, toggle button, not pressed" (or the browser's equivalent).
3. **Given** a toggle is pressed, **When** the setting saves, **Then** "Guardado" is announced once.

### User Story 2 - Everyone can see where focus is and read every field edge (Priority: P1)

Every focused control shows a ring with at least 3:1 contrast against what is next to it. Every text field's border reaches 3:1.

**Why this priority**: the problem is in shared rules, so fixing a few rules repairs every page. The risk is low.

**Independent Test**: The contrast test (see `contracts/visual-system-test.md`) passes. Manually, tab through contacto, login, herramientas and comprar-casa and see the ring every time.

**Acceptance Scenarios**:

1. **Given** any `.form-group` field, **When** it gets focus, **Then** the ring is `--accion` on light backgrounds or `--agua` on dark ones.
2. **Given** an admin changed `--gold` in the color editor, **When** a page loads, **Then** focus rings and field borders keep their contrast (they no longer read `--gold` or `--gold-light`).

### User Story 3 - The site looks like one product (Priority: P2)

Leftovers from the old brown/gold palette, gradient buttons, pill-shaped action buttons, ALL-CAPS labels and ad-hoc text sizes are gone. The same kind of element looks the same on every page.

**Why this priority**: visible on every tool page, and it undermines trust. It follows P1 because it changes more rules.

**Independent Test**: The consistency test bans the known leftover values. Before/after screenshots of the 18 pages show no unintended layout change.

**Acceptance Scenarios**:

1. **Given** any page, **When** its CSS is scanned, **Then** no `rgba(201,138,62,…)`, `rgba(184,134,59,…)`, `#171008` or `linear-gradient(135deg,var(--gold-light),var(--gold))` remains.
2. **Given** any action button (`.btn*`, `.auth-cta-btn`, upload and select buttons), **When** it is rendered, **Then** it has 6px corners, Bricolage Grotesque and sentence case.

### User Story 4 - Each tool page opens with its own "paper" (Priority: P3, trial on credito only)

On credito, the hero shows a sample credit report line highlighted in yellow with a note in Spanish, in the tool's lavender color and without a stock photo. The analyzer sits on a light background right after it.

**Why this priority**: largest brand gain, but it depends on US3's cleanup and it is a design trial. The owner decides after seeing it whether it rolls out to other tool pages.

**Independent Test**: Open credito.html at desktop and 375px widths. The hero shows the paper sample, there is one primary action, and the analyzer is on paper background. Every `data-umami-event` from before is still present.

**Acceptance Scenarios**:

1. **Given** credito.html at ≤720px, **When** it loads, **Then** the headline and the primary button appear before the paper sample, and nothing scrolls sideways.
2. **Given** reduced motion is on, **When** the page loads, **Then** the highlight appears already drawn, with no animation.

### Edge Cases

- An admin saved custom colors for `--gold`, `--navy` or other legacy tokens in Supabase `contenido_sitio`: legacy names keep working. Only accessibility-critical roles stop following them (see research R2).
- A page is opened without JavaScript: the backup forms stay hidden (`hidden` attribute works without JS), and the paper hero is static HTML.
- Netlify must still detect the backup forms at deploy: they stay in the HTML with the `hidden` attribute.
- Very long headline from the CMS (`data-cms`): the hero wraps without overflowing at 320px.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 3 Netlify backup forms (agendar, formar-negocio, listar-negocio) MUST be removed from the keyboard order and from the accessibility tree while staying in the HTML.
- **FR-002**: The 3 cuenta toggles MUST have accessible names tied to their visible labels. The save confirmation MUST be announced politely and be at least .75rem.
- **FR-003**: Name, email, phone, address and business fields listed in plan C1 MUST have correct `type`, `autocomplete` and `name`. Every admin field MUST have a label.
- **FR-004**: Focus rings MUST use role tokens (`--focus-color`), never `--gold` or `--gold-light`, and MUST reach 3:1 against their adjacent background.
- **FR-005**: Text field borders MUST use `--borde-campo`.
- **FR-006**: `--gold` MUST NOT be used as a text color on light backgrounds.
- **FR-007**: The leftover brown values, the gold gradient and `#171008` MUST be replaced by palette values, mapped by what they do (shadow, tint, surface).
- **FR-008**: Action buttons MUST follow the 011 shape rule (6px) and type rule (Bricolage, sentence case). Pills remain only for chips, tags and progress tracks.
- **FR-009**: Labels MUST NOT use `text-transform:uppercase`. Decorative text that is `aria-hidden` is exempt.
- **FR-010**: Font sizes in `styles.css` and in the pages touched by this feature MUST come from the type-scale tokens.
- **FR-011**: Each shared component (`.btn*`, `.eyebrow*`) MUST be defined once in `styles.css`.
- **FR-012**: credito.html MUST use the shared paper-hero component, with the analyzer on a light background and one primary action in the hero.
- **FR-013**: The Auto Coach iframe (herramientas.html) MUST use site colors and fonts, 6px corners, ≥3:1 field borders and visible focus, and it MUST never clip its content.
- **FR-014**: Every existing `data-umami-event` value, URL, `id` used by scripts, form `name` and `data-cms` key MUST be preserved.
- **FR-015**: An automated test MUST enforce FR-004 to FR-009 so the leftovers cannot return.
- **FR-016** (owner report, 2026-09-28): moving between pages MUST NOT make the header blink, move, or change size or color. Page transitions MUST be smooth where the browser supports it and MUST respect reduced motion.
- **FR-017**: the header MUST have the same height, background and logo size on all pages. The current section MUST be marked in the bar, including when its link sits inside a dropdown.
- **FR-018**: content that is visible on first load MUST NOT change after the first paint (fonts with matched fallbacks, the account link with reserved space, CMS values applied only when they differ, no reveal animation in the first screen).

### Key Entities

- **Role token**: a CSS variable named for what it does (focus, field border, accent text), set from the base palette and not editable in the admin panel.
- **Legacy alias**: `--gold`, `--gold-light`, `--navy`, `--navy-deep`, `--teal`. Kept because the admin color editor writes them (admin.html:587–591).
- **Paper sample**: the shared hero component (sheet, highlighted line, explanatory note) currently private to index.html.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 unlabeled controls reachable by keyboard on the 18 pages (screen-reader walkthrough plus the test).
- **SC-002**: 100% of focus rings and field borders measured by the test reach 3:1.
- **SC-003**: 0 occurrences of the banned leftover values across `*.html` and `styles.css`.
- **SC-004**: Hard-coded font sizes in `styles.css` go from 158 to 0 (outside the token block). The pages touched by C4 have none either.
- **SC-005**: `node --test tests/` passes, including the existing 25 test files.
- **SC-006**: The before/after screenshot review of the 18 pages shows no unintended layout change. Every difference is listed and explained.
- **SC-007**: The owner approves the credito trial before any other page gets the paper hero.

## Assumptions

- The "Mar en calma" palette, the fonts and the highlighter idea stay.
- The site stays plain HTML, CSS and JS with no build step (constitution).
- Supabase `contenido_sitio` may hold saved colors. Plan C2 is safe either way because it only stops reading the legacy aliases in accessibility-critical rules.
- Rolling the paper hero out to pages other than credito is out of scope. It becomes a follow-up if the trial is approved.
- The minor items (heading order, "…", `Intl.NumberFormat`, "Escríbeme", image dimensions) are included only in the pages that get touched anyway.
