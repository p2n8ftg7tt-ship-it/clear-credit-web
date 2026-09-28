# Feature Specification: UX Audit Remediation (Trust, Accessibility, Consistency)

**Feature Branch**: `011-ux-audit-remediation`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Convert the approved visual/UX audit (phases 1-6) into an implementation specification: trust identity + unified footer, accessibility fixes (focus on dark, minimum label size, contrast tokens, touch target), performance (defer scripts, lazy assistant), unified shape system via tokens, token consolidation of inline hex, contrato-auto alignment, single header/footer source, floating layer policy, one primary CTA per hero. Reuse the existing architecture, minimal changes, no rewrites."

## Objectives

1. **Trust**: every public page tells a cautious visitor who operates Themora and how to reach it, using the identity mechanism that already exists.
2. **Accessibility**: close the WCAG 2.1 AA gaps found in the audit (focus visibility on dark areas, tiny labels, low-contrast text and borders, small touch target).
3. **Speed**: the first paint no longer waits for scripts it does not need.
4. **Consistency**: one shape system, one footer, one header, color values from the shared palette. The site should read as one product, not several.
5. **Focus**: each hero has one primary action, and floating elements never pile up.

Non-goals: new pages, new features, copy rewrites, dark mode, a framework/build step, changing URLs, primary nav labels, form field names, or analytics event names.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A cautious visitor can see who runs the site (Priority: P1)

A Spanish-speaking visitor who distrusts sites that ask for documents or money scrolls to the footer (or looks next to a price) to find out who is behind Themora before uploading a letter or paying.

**Why this priority**: The site charges money and handles credit data. With no visible operator, contact channel or disclaimer, trust and conversion fail no matter how good the design is.

**Independent Test**: Open any public page, scroll to the footer, and confirm the same footer shows: service links, company links, legal links, the "what we are not" disclaimer, and (once the owner supplies it) the legal operator line. Open a page with a price and confirm the operator line is visible near the price.

**Acceptance Scenarios**:

1. **Given** the owner has filled in the legal identity data, **When** a visitor opens any of the 17 public pages, **Then** the footer shows the legal name, state and contact email, identical on every page.
2. **Given** the legal identity data is still empty, **When** a visitor opens any page, **Then** nothing invented or "coming soon" is shown (existing behavior is kept) and the rest of the unified footer still appears.
3. **Given** a page shows a price (formar-negocio, listar-negocio, terminos, index), **When** identity data exists, **Then** an "Operated by [legal name], [state]" line appears within the pricing/payment block.
4. **Given** a phone or WhatsApp number is configured, **When** a visitor opens Contacto, **Then** it is shown as a direct channel (existing behavior, verified not changed).

---

### User Story 2 - A keyboard or low-vision user can use every page (Priority: P1)

A person navigating by keyboard, or reading with poor eyesight on a phone, moves through the dark hero, dark bands and footer, reads the contract figures, and taps the mobile menu button.

**Why this priority**: These are legal-level accessibility failures sitting on the main calls to action and on the fine print the product promises to make readable.

**Independent Test**: Tab through index, comprar-auto and contrato-auto. Focus must always be visible. Check with a contrast tool that the listed elements meet their ratios. Measure the mobile menu button.

**Acceptance Scenarios**:

1. **Given** focus lands on a link or button inside a dark hero, dark band, dark tile or the footer, **When** it is focused by keyboard, **Then** the focus indicator has at least 3:1 contrast against that dark background.
2. **Given** any label that carries meaning (contract fields, stats, card keys), **When** rendered at default zoom, **Then** its size is at least 14px and text on dark backgrounds is at least 70% opaque, with ≥4.5:1 contrast.
3. **Given** form inputs on light backgrounds, **When** displayed, **Then** their borders reach at least 3:1 contrast against the surrounding background.
4. **Given** the logged-in account button and any text colored with a tool's stripe color, **When** displayed, **Then** the text has at least 4.5:1 contrast.
5. **Given** a phone width of 360px, **When** the menu button is measured, **Then** it is at least 44×44px, and group labels inside the open mobile menu do not look or behave like buttons.

---

### User Story 3 - Pages feel like one calm, professional product (Priority: P2)

A visitor moving from the homepage to Comprar casa, Crédito, and the car contract review sees the same header, the same corners, the same button shapes and the same colors.

**Why this priority**: Mixed corner shapes, leftover gold-era components and a different header on one page make the site read as "assembled", which undermines the premium, trustworthy perception.

**Independent Test**: Compare screenshots of the 17 public pages at 1280px and 390px. Cards, inputs and buttons use the same corner rule. The header is identical on all pages. No gold-era styling remains visible.

**Acceptance Scenarios**:

1. **Given** any card, input, button, menu or panel, **When** rendered, **Then** its corners follow the documented shape rule (6px for surfaces and controls; full pill only for chips/tags; circle only for avatars and the assistant launcher).
2. **Given** contrato-auto, **When** compared with any other public page, **Then** its header has the same links (including the account link) and its hero uses the shared hero pattern, including the tool color stripe.
3. **Given** the page-specific style blocks in the five heaviest pages, **When** inspected, **Then** colors that match a palette color use the shared palette name instead of a raw value.
4. **Given** a future edit to the header or footer, **When** the project tests run, **Then** they fail if any public page's header or footer diverges from the reference.

---

### User Story 4 - Pages open fast on a mid-range phone (Priority: P2)

A visitor on a mid-range Android phone over mobile data opens the homepage and a tool page.

**Why this priority**: A slow first paint reads as unreliable to a distrustful audience and costs conversions.

**Independent Test**: Load index and comprar-casa with mobile throttling. Content appears without waiting for assistant/search scripts. The assistant launcher still appears and works; the local (non-AI) answer path still works.

**Acceptance Scenarios**:

1. **Given** any public page, **When** it loads, **Then** no script that is not needed for the first view blocks rendering.
2. **Given** the assistant launcher, **When** the visitor opens it for the first time, **Then** its answering components load at that moment and it answers normally, including the local path without AI (Constitution III).
3. **Given** the rate banner, analytics, editable content and identity scripts, **When** the page loads, **Then** they behave exactly as before.

---

### User Story 5 - One clear next step, nothing covering it (Priority: P3)

A visitor on a phone reading Comprar casa or Comprar auto sees one obvious primary action per hero and is never blocked by several floating widgets at once.

**Why this priority**: Polish that improves conversion clarity; lower risk and lower urgency than P1/P2.

**Independent Test**: On 390px width, open index, comprar-casa, comprar-auto. Count visible floating elements and primary buttons per hero.

**Acceptance Scenarios**:

1. **Given** the homepage hero, **When** displayed, **Then** it has exactly one primary action ("Explicar mi carta gratis"), and the business entry point is the primary action of the dark business band below.
2. **Given** any page on a phone, **When** scrolled, **Then** at most one floating element (the assistant launcher) sits over the content; other prompts (talk card, rate notice, WhatsApp) appear inline in the page flow.
3. **Given** a visitor typing in a form field on a phone, **When** the field has focus, **Then** the floating launcher does not cover the field or the submit button.

### Edge Cases

- Identity data partially filled (e.g. name but no state): show only the filled parts, never placeholders (existing `empresa.js` rule).
- No JavaScript: header, footer and all content remain visible and usable (they stay as static markup); only the assistant is unavailable.
- Assistant scripts fail to load on first open: the launcher shows a short Spanish message pointing to Contacto, not a broken panel.
- Print view of contrato-auto: keeps its current print rules (header, footer and launcher hidden).
- Admin page: excluded from footer unification and public-page checks (internal tool).
- Zoom to 200%: no horizontal scrolling on any public page at 1280px width.
- Reduced motion / reduced transparency preferences: existing behavior preserved.

## Requirements *(mandatory)*

### Functional Requirements

**Trust (Phase 1)**

- **FR-001**: All 17 public pages MUST share one footer with four groups: services (Cartas Claras, Contrato del dealer, Crédito, ¿Aparezco?), company (Quiénes somos, Contacto, Agendar), legal (Privacidad, Términos), and a one-line "what we are not" disclaimer reusing the homepage "Lo que no somos" wording.
- **FR-002**: The footer MUST keep the existing legal identity slot, which renders only when the owner has filled the identity data, and MUST NOT show invented or placeholder data (Constitution I).
- **FR-003**: Every price/payment block MUST show the operator line (legal name and state) when identity data exists, reusing the existing identity mechanism.
- **FR-004**: `cuenta.html` and `login.html` MUST be excluded from search indexing.

**Accessibility (Phase 2)**

- **FR-005**: The focus indicator MUST reach ≥3:1 contrast on every background it can appear on, including dark heroes, dark bands, dark tiles and the footer.
- **FR-006**: Meaningful labels MUST be at least 14px at default zoom; text on dark backgrounds MUST be ≥70% opaque and ≥4.5:1 contrast.
- **FR-007**: Form input borders MUST reach ≥3:1 contrast against their background; decorative dividers may stay lighter.
- **FR-008**: Tool stripe colors MUST NOT be used as text colors; text uses the action color instead. The logged-in account button MUST meet 4.5:1.
- **FR-009**: The mobile menu button MUST be at least 44×44px; group labels in the open mobile menu MUST present as headings, not buttons.

**Performance (Phase 3)**

- **FR-010**: Pages MUST NOT download assistant components that are not needed for the first view (research R3: scripts already sit at the end of the page; the waste is about 185 KB of assistant files loaded on every page).
- **FR-011**: The assistant's brain and laws files MUST load on first use of the launcher, not on page load, while keeping the local non-AI answer path (Constitution III). The small search index stays loaded with the page.
- **FR-012**: The unused background video MUST be removed from the published site if no page references it.

**Consistency (Phases 4-5)**

- **FR-013**: The site MUST follow one documented shape rule: 6px for cards, inputs, buttons, menus and panels; full pill only for chips/tags; circle only for avatars and the launcher. The shared corner values MUST be redefined so existing components inherit the rule without per-component rewrites.
- **FR-014**: Leftover gold-era visuals (gold avatar fill, large-radius cards, heavy shadows) MUST no longer be visible anywhere.
- **FR-015**: In the five heaviest pages (comprar-casa, credito, contrato-auto, cartas-claras, index), off-palette colors MUST be mapped to the palette by meaning (error → danger red, neutral text → ink/muted, success → green, warm tints → rosa copy). White/black and print-only rules stay. Values with no clear meaning are listed, not changed.
- **FR-016**: contrato-auto MUST use the same header as the other public pages (adding the missing account link). Its custom hero stays, since it already carries the green tool stripe; print behavior is unchanged.
- **FR-017**: The header and footer MUST stay as static markup in each page (no runtime injection). An automated project test MUST verify that the header and footer of every public page match the reference page.
- **FR-018**: The inline-styled "Lo que no somos" heading on the homepage MUST use the shared section-heading style.

**Focus and polish (Phase 6)**

- **FR-019**: The homepage hero MUST have one primary action; the "Tengo un negocio" action moves to the business band as its primary action, keeping its analytics event name.
- **FR-020**: At most one floating element (the assistant launcher) MAY overlay content on any page on screens ≤720px; the comprar-casa floating houses strip MUST render inline there (the rate notice and talk card already do). The launcher MUST hide while a text field has focus on screens ≤720px.

### Key Entities

- **Legal identity**: legal name, state, registration number, address, legal email. Already defined in `empresa.js`; filled by the owner, never by code.
- **Design tokens**: the shared palette, corner, spacing and focus values in `styles.css :root`. This feature changes values and adds a few (dark-context focus, input border, label minimum), without renaming existing ones.

## Implementation Scope *(reuse-first)*

### Affected files

| Area | Files | Change size |
|---|---|---|
| Identity data | `empresa.js`, `whatsapp.js` (owner fills values only) | data only |
| Footer unification | 17 public `*.html` (footer block only) | ~10 lines each |
| Operator line near price | `pago.js` or price blocks with `data-precio-de` | small |
| noindex | `cuenta.html`, `login.html` (`<head>`) | 1 line each |
| Tokens, focus, labels, borders, shape, touch target, mobile menu, floating policy | `styles.css` (`:root` + targeted rules near L90, L126, L139, L176-194, L306-316, L345, L363-408, end-of-file block) | ~40-60 lines |
| Script loading | `<script>` tags in 17 public pages; `credit-coach.js` (lazy load on first open) | small per page |
| Inline color → palette names | `<style>` of comprar-casa, credito, contrato-auto, cartas-claras, index | replace values only |
| contrato-auto alignment | `contrato-auto.html` (header + hero class) | small |
| Homepage CTA + heading | `index.html` (hero actions, business band, L417) | small |
| Floating prompts inline | `comprar-casa.html`, `comprar-auto.html`, `tasas-hipoteca.js` (banner placement), `styles.css` talk-card | small |
| Consistency test | new `tests/cabecera-pie.test.js` | new, small |
| Unused media | `media/cartas-fondo.mp4`, `media/cartas-fondo-poster.jpg` (if unreferenced) | delete |

Not touched: `admin.html`, Netlify functions, Supabase schema, Zyron logic/content, URLs, nav labels, form field names, analytics event names.

### UI changes

- Unified four-group footer on dark petrol with the disclaimer line and the identity slot.
- Focus ring switches to the light water color inside dark areas.
- Contract/stat labels grow to ≥14px; dim white text raised to ≥70%.
- Inputs get a visible border color; dividers unchanged.
- All surfaces and controls use 6px corners; pills only on chips; gold avatar fill becomes the petrol/water palette.
- contrato-auto gets the standard header and hero with green stripe.
- Homepage hero shows one primary button (plus the existing "free, no account" note); the business band gains the "Tengo un negocio" primary button.

### UX changes

- Operator identity visible next to every price (once supplied).
- Account link available from contrato-auto.
- On phones: only the assistant launcher floats; it steps aside while typing. Talk card and rate notice sit in the page flow.
- Assistant opens with a brief loading moment on first use only.

### Responsive requirements

- Verify at 360, 390, 768, 1024 and 1280px widths.
- Footer groups: 4 columns ≥1000px, 2 columns 600-999px, 1 column <600px; all links ≥44px tall tap area on phones.
- No horizontal page scroll at any width, including 200% zoom at 1280px.
- Mobile menu: 44×44px button; open menu scrolls within the viewport.
- Floating launcher never overlaps a focused input or its submit button on ≤720px.

### Accessibility requirements (WCAG 2.1 AA)

- 1.4.3: all text ≥4.5:1 (≥3:1 for large text), including labels on dark backgrounds and the logged-in account button.
- 1.4.11: focus indicators and input borders ≥3:1 against adjacent colors.
- 2.4.7: visible focus on every interactive element on every background.
- 2.5.5 (target size, best practice): menu button and footer links ≥44×44px on touch screens.
- 1.4.4 / 1.4.10: readable and scroll-free at 200% zoom.
- Keep: skip link, single h1, image alt text, labeled form fields, reduced-motion and reduced-transparency handling, `lang` attributes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 17 of 17 public pages show the identical footer (verified by the automated consistency test), and 100% of price blocks show the operator line once identity data exists.
- **SC-002**: 0 focus-visibility failures when tabbing through index, comprar-auto, contrato-auto and credito; 0 text-contrast failures below 4.5:1 in an automated accessibility scan of all public pages.
- **SC-003**: No meaningful label renders below 14px at default zoom on any public page.
- **SC-004**: Every public page downloads at least 180 KB less on first load, first paint is not slower than before, and the assistant still answers on first open, including with AI unavailable.
- **SC-005**: Across all public pages, corner shapes fall into exactly three categories (6px, pill for chips, circle for avatars/launcher), confirmed by visual review at 390px and 1280px.
- **SC-006**: On 390px width, at most 1 floating element overlays content on any page.
- **SC-007**: The homepage hero has exactly 1 primary action; the business band click-through event keeps its existing name, so analytics comparisons stay valid.
- **SC-008**: All existing project tests plus the new header/footer test pass before publishing.

## Implementation Order

1. **Phase 1 - Trust**: unified footer markup (FR-001/002), noindex (FR-004), operator line (FR-003). Owner fills identity data in parallel.
2. **Phase 2 - Accessibility tokens**: focus on dark (FR-005), labels (FR-006), input borders (FR-007), stripe-as-text and account button (FR-008), menu button (FR-009). CSS only.
3. **Phase 3 - Performance**: non-blocking scripts (FR-010), lazy assistant (FR-011), remove unused media (FR-012). Retest the assistant and banner.
4. **Phase 4 - Shape system**: redefine corner values and retire gold-era visuals (FR-013/014). Visual review of all pages.
5. **Phase 5 - Consolidation**: inline colors to palette (FR-015), contrato-auto alignment (FR-016), consistency test (FR-017), homepage heading (FR-018).
6. **Phase 6 - Focus and polish**: one hero CTA (FR-019), floating-layer policy (FR-020).

Each phase is independently shippable and deployed through the normal GitHub → Netlify flow.

## Assumptions

- The owner supplies the legal name, state, registration number, address, legal email and (optionally) phone/WhatsApp. Until then, FR-002/FR-003 render nothing, which is correct behavior, and SC-001's operator-line part is verified once data exists.
- Header and footer stay as static copies in each page; consistency is enforced by a test instead of runtime injection, to keep no-JS rendering, SEO and the current architecture intact.
- Consolidating inline styles into `styles.css` is out of scope; only color values are normalized (FR-015). Moving shared patterns can be a later feature.
- Dark mode stays out of scope; the light "paper" look is a deliberate brand choice.
- The em-dash (raya) is valid Spanish punctuation and is not changed.
- `admin.html` is internal and excluded from footer/header rules.
- Constitution principles I-V apply: no invented identity data, assistant keeps its local path, no new external services.
