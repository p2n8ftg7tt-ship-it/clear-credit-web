# Feature Specification: Floating Rate Houses (Buy-a-House page)

**Feature Branch**: `006-floating-rate-houses` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Arma en comprar-casa dos iconos de casa flotante que indiquen la hipoteca a 15 y 30 anos los intereses visibles y esos seran los agentes activos que muestren en tiempo real la tasa de interes dictadas por las grandes companias de hipoteca y la fed"

In plain words: on the **Comprar casa** page, two **floating house icons** — one for the **15-year** mortgage and one for the **30-year** mortgage — each with its **interest rate visible on the icon itself**. The two houses *are* the "active agents": they show the current rate that the big mortgage players and the Federal Reserve are setting, and they keep it up to date so the visitor always sees the latest reading without hunting for it.

## What already exists (checked 2026-09-21)

| Finding | Evidence |
|---------|----------|
| The **Rate Watch Agent** (feature 004) is already built on the Buy-a-House page as a fixed block: 30- and 15-year rates, change since last reading, dates, sources, alerts, "agent active" status pill. It is **hidden until launch** because its setup steps are not done yet. | `comprar-casa.html` section `#tasas` (`hidden`); `specs/004-mortgage-rate-agent/`; `tasas-hipoteca.js`. |
| 004 already decided **where the numbers come from**: the weekly national survey (Freddie Mac) is the headline for both terms; the 10-year Treasury yield and Federal Reserve target-rate changes are supporting signals; a daily mortgage-rate index and weekly application data were **left out of v1** because their terms of use could not be verified. Sources are never blended or averaged. | `specs/004-mortgage-rate-agent/spec.md` Clarifications, FR-015, FR-017, FR-018, FR-029. |
| 004 publishes on **Mondays and Tuesdays** and watches every day; a failed refresh keeps the last verified figures, labeled as not refreshed. | `specs/004-mortgage-rate-agent/spec.md` FR-006 to FR-009. |
| Project rules that shape this feature: figures must carry a source and read as an educational reference, never as an offer or advice; nothing may be shown to the public before its setup steps are documented and done; every numeric fact lives in one source; analytics records only categorical events; the site must keep working when something fails. | `.specify/memory/constitution.md` principles I–IV. |

**What is new in this request:** (a) the rates become **two floating house icons** that stay in view, instead of only a fixed block further down the page; (b) the wording "**real time**" and "**rates dictated by the big mortgage companies and the Fed**". Point (b) goes further than what 004 decided is allowed and possible, so it is a clarification below rather than an assumption.

## Clarifications

### Session 2026-09-21

- Q: What may feed the "real time" rates from "the big mortgage companies and the Fed"? → A: C — only the feature-004 sources feed the numbers on the houses (weekly Freddie Mac survey as the headline; 10-year Treasury yield and Federal Reserve target rate as daily signals). Each house also **links to the official rate pages of the big mortgage lenders**, without showing their figures. The houses never say "en vivo / real time" for a weekly figure; they show the true "as of" date.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See both mortgage rates at a glance on two floating houses (Priority: P1)

A Spanish-speaking home buyer opens **Comprar casa** and sees two small **house icons floating** over the page: one labeled **30 años** and one labeled **15 años**. Each house shows its **interest rate as a visible number on the icon** (for example "6.2%"). The houses stay in view while the visitor scrolls through the 8 steps and the loan-type comparison, so the rates are never more than a glance away.

**Why this priority**: This is the request itself and the smallest slice that is useful alone: a visible, always-present rate for each term. Everything else builds on it.

**Independent Test**: Load the page with verified rate data. Confirm two houses are visible, one per term, each showing a rate number, and that both remain visible while scrolling to the bottom of the page and back.

**Acceptance Scenarios**:

1. **Given** verified rate data exists, **When** the visitor opens the page, **Then** two floating houses appear, one for 30 years and one for 15 years, each showing its interest rate as a number without any tap or hover.
2. **Given** the houses are shown, **When** the visitor scrolls the whole page, **Then** both houses stay visible and do not jump, overlap each other, or cover page text, forms, buttons or navigation.
3. **Given** a phone-width screen, **When** the page renders, **Then** both houses fit on screen at once, their rate numbers are readable, and they do not block taps on the content underneath or cause horizontal scrolling.
4. **Given** a visitor who prefers reduced motion, **When** the houses render, **Then** no floating/bobbing animation plays and the houses are simply fixed in place.

---

### User Story 2 - The houses are the "active agents": live status, freshness and change (Priority: P1)

Each house **is** an active agent. It visibly signals that it is **working** (an "activo" indicator), shows **when its figure was last updated**, and shows whether the rate **went up, down, or stayed the same** since the previous reading. When an **important change** is detected (the 004 rule: a move of 0.125 points or more, or a Federal Reserve target-rate change), the house **marks itself** so the visitor notices, and the same alert text as the fixed block is one tap away.

**Why this priority**: The user calls the houses "agentes activos" that show the rate "en tiempo real". Freshness and honesty are the whole point of an agent, and a rate that silently goes stale misleads people making a very large money decision.

**Independent Test**: Feed a newer reading and confirm both houses update their number, date and up/down mark. Feed a reading that crosses the alert threshold and confirm the affected house shows the alert mark. Simulate a failed refresh and confirm the houses keep the last verified figure labeled as not refreshed, with no invented number.

**Acceptance Scenarios**:

1. **Given** a new verified reading is published, **When** the visitor has the page open or opens it, **Then** each house shows the new rate, the new "updated" date/time, and the change versus the previous reading (up / down / unchanged, in percentage points), without the visitor reloading more than once.
2. **Given** an important change was detected for a term, **When** the visitor sees the page, **Then** that term's house shows an alert mark and the alert (what changed, size, date, source) is reachable in one tap.
3. **Given** a refresh failed or a source was unreachable, **When** the visitor sees the page, **Then** the houses show the last verified figures with their original date and a visible "no actualizado / not refreshed" label, never a number no source published.
4. **Given** no verified reading has ever been published, **When** the visitor opens the page, **Then** the houses do not show placeholder or example numbers; they are hidden or show an honest "tasa no disponible todavía", and the rest of the page works normally.
5. **Given** a house is showing an alert or a not-refreshed label, **When** the visitor reads it, **Then** the text describes only what changed or what is stale — no advice, prediction, or "good time to buy/lock".

---

### User Story 3 - Tap a house to see where its rate comes from (Priority: P2)

The visitor taps (or clicks / presses Enter on) a house and a small panel opens next to it with: the term, the rate, the change, the date, the **source(s)** behind the figure with links, what each source measures, the Federal Reserve context, links to the big lenders' own rate pages (FR-022), the reference-only disclaimer, and a link to the full rate-watch block further down the page. The panel closes with a second tap, an explicit close control, or the Escape key, and it never traps the visitor.

**Why this priority**: The rates must be traceable to the "big players and the Fed" the user mentioned, and honest about what they are. It is P2 because the visible numbers on the houses (Stories 1–2) already deliver the essential value.

**Independent Test**: Tap each house and confirm the panel shows the term, rate, change, date, at least one named source with a working link, the disclaimer and a link to the full block; confirm it opens and closes by touch and by keyboard, and that focus returns to the house.

**Acceptance Scenarios**:

1. **Given** a house is showing a rate, **When** the visitor taps it, **Then** a panel shows the source(s) for that figure, what each measures and how often it publishes, with links.
2. **Given** the panel is open, **When** the visitor presses Escape or taps the close control, **Then** it closes and keyboard focus returns to the house that opened it.
3. **Given** the panel is open on a phone, **When** it renders, **Then** it fits the screen, scrolls within itself if needed, and does not push the page sideways.
4. **Given** the panel is open, **When** the visitor reads it, **Then** it states these are national reference figures, not an offer, approval or the visitor's personal rate, and includes no advice or prediction.
5. **Given** the visitor uses only a keyboard or a screen reader, **When** they reach a house, **Then** it is reachable, announces its term, rate, updated date and status, and can be opened without a mouse.

---

### User Story 4 - The houses only appear when the agent is cleared to go public (Priority: P2)

The floating houses respect the same **launch gate** as the fixed rate block. They never appear on the public page until the rate agent's setup steps are documented and done, and they read the **same published reading** as the fixed block, so the two never disagree.

**Why this priority**: The project rule is that nothing is shown to the public before its setup is done, and a number that differs between the houses and the block would be a factual error. It is P2 because it protects the launch rather than adding visitor-facing behavior.

**Independent Test**: With the agent not yet launched, confirm no houses appear. After launch, change the published reading and confirm the houses and the fixed block show identical rates and dates.

**Acceptance Scenarios**:

1. **Given** the rate agent has not been launched, **When** any visitor opens the page, **Then** no floating houses are shown.
2. **Given** the rate agent is launched, **When** the fixed block and the houses both show a term, **Then** the rate, change, date and source are identical in both places.
3. **Given** the data cannot be loaded, **When** the visitor opens the page, **Then** the houses show nothing or an honest message, never an error screen, and the rest of the page (roadmap, loan types, comparator) works as before.

---

### Edge Cases

- **A house would cover something important** (a form field, the sticky navigation, another floating widget such as the assistant chat or a cookie/notice bar). The houses must never cover another floating widget or the sticky navigation, and must step out of the way (hide temporarily) while a form field has focus or a full-screen tool is open; if there is no room, they collapse to a compact form rather than overlap.
- **Very small or very short screens (landscape phone).** Both houses must remain reachable and readable; if they cannot both fit expanded they show the rate only, still tappable.
- **The two terms have the same rate or one is missing.** If only one term has a verified reading, only that house is shown; a missing rate is never filled with an estimate.
- **Rate crosses a rounding boundary or is a long decimal.** The visible rate is shown in one consistent format (for example one or two decimals) and matches the fixed block exactly.
- **The page is open for a long time.** The houses pick up a newer published reading without the visitor reloading the whole page; if refreshing fails, the "updated" time stays honest and a not-refreshed label appears once the figure is older than the expected refresh window.
- **Visitor closes/hides the houses.** [See FR-014] A visitor who finds them distracting can dismiss them for that visit without losing access to the rates in the fixed block.
- **A supporting signal (Treasury yield or Fed change) moves before the weekly survey.** The house may show an alert mark, but its headline rate does not change until the headline source publishes, and the alert says so (rule inherited from 004, FR-029).
- **Big-lender rates.** Individual lenders' rates are never displayed on the houses or in the panel; a lender appears only as a link to its own official rate page (FR-022). If a lender's page moves or breaks, the link is removed or fixed by the owner; a broken lender link must not break the panel.
- **No JavaScript, offline, or data blocked.** The houses simply do not appear; nothing else on the page breaks.
- **Language.** The page is Spanish-first; any other-language text must not contradict the Spanish original and follows the project's "pending native review" rule for AI-made translations.
- **The FHA-vs-conventional comparator still has editable example rates.** Those stay labeled as examples and are not linked to the houses in this version.

## Requirements *(mandatory)*

### Functional Requirements

**The two houses**

- **FR-001**: The Buy-a-House page MUST show two floating house icons, one for the **30-year fixed** and one for the **15-year fixed** mortgage, each labeled with its term.
- **FR-002**: Each house MUST display its **interest rate as a visible number on the icon** at all times (no tap or hover needed).
- **FR-003**: The houses MUST stay in view while the visitor scrolls the page, MUST NOT overlap each other, and MUST NOT cover other floating widgets or the site navigation, on desktop and phone. Because any floating element necessarily sits over some page content at some scroll position, the houses MUST also stay small and in a corner, MUST hide temporarily while a form field has focus or a full-screen tool is open, MUST NOT trap the last content of the page behind them, and can be dismissed by the visitor (FR-014).
- **FR-004**: The houses MUST be readable and tappable at phone width without horizontal scrolling, and MUST respect the visitor's reduced-motion preference (no continuous animation when reduced motion is requested).
- **FR-005**: The houses MUST reuse the page's existing visual identity and MUST be operable by keyboard and announced correctly by screen readers (term, rate, updated date, status).

**Active-agent behavior**

- **FR-006**: Each house MUST show that it is an **active agent** (an "activo" status) only while its figure is fresh **and** the agent has successfully checked its sources recently (last successful check no more than 48 hours old, when that time is known), and MUST show a not-refreshed status instead when it is not.
- **FR-007**: Each house MUST show the **date/time of its last update** and the **direction and size of the change** (percentage points) versus the previous reading, and MUST update when a newer reading is published without requiring more than one page reload.
- **FR-008**: The rate numbers shown on the houses MUST come only from the sources already approved for the rate agent (feature 004): the weekly national survey (Freddie Mac) as the headline for both terms, with the 10-year Treasury yield and Federal Reserve target-rate changes acting only as supporting signals that can raise an alert. The houses MUST NOT display a figure taken from any other source, and MUST NOT blend or average sources.
- **FR-009**: The houses MUST NOT claim or imply "real time" or "live" rates, because the headline source publishes weekly; the label MUST state the true "as of" date/time of the figure instead. The daily watching of the supporting signals MAY be described as "vigilando a diario" but never as a live rate.
- **FR-022**: Each house's details panel MUST include links to the **official rate pages of the big U.S. mortgage lenders** (list approved by the owner before launch), presented as "see each lender's own rates" without showing, copying or summarizing any lender's figures. The list MUST NOT rank, recommend or imply endorsement of any lender, and MUST say that rates at those pages are the lender's own and vary by borrower.
- **FR-010**: If a refresh fails or a source is unreachable, the houses MUST keep the last verified figure labeled as not refreshed with its original date, and MUST NOT display any value no source published.
- **FR-011**: If no verified reading exists for a term, that house MUST NOT show a placeholder or example number; it is hidden or shows an honest "not available yet" message.

**Alerts and details**

- **FR-012**: When the rate agent raises an important-change alert for a term (004 rules: move of at least the owner-adjustable threshold, or a Federal Reserve target-rate change), the affected house MUST show an alert mark, and the alert (term, direction, size, date detected, source) MUST be reachable in one tap.
- **FR-013**: Tapping/clicking/pressing Enter on a house MUST open a details panel with the term, rate, change, date, source(s) with links, what each source measures and how often it publishes, the Federal Reserve context, the lender links (FR-022), the reference-only disclaimer, and a link to the full rate-watch block. The panel MUST close by tapping a close control, pressing Escape, or tapping the house again, and MUST return focus to the house.
- **FR-014**: The visitor MUST be able to dismiss the houses for the current visit, remembered only in their own browser, without losing access to the rates in the fixed block.

**Honesty and project rules**

- **FR-015**: All text on the houses, the alert mark and the panel MUST describe only what the figures are and what changed; it MUST NOT tell the visitor what to do, predict rates, or say whether it is a good time to buy, lock or refinance; it MUST state the figures are national averages for educational reference, not an offer, approval, or personal quote.
- **FR-016**: The houses MUST read the **same published reading** as the fixed rate block so rate, change, date and source are identical in both; there MUST be a single source of truth for every rate figure on the site.
- **FR-017**: The houses MUST NOT appear to the public until the rate agent's launch steps are documented and done (same gate as the fixed block).
- **FR-018**: Loading and showing the houses MUST NOT require sign-in or send any personal or financial data; if the houses or their data cannot load, the rest of the page MUST keep working with no error shown.
- **FR-019**: Analytics for the houses MUST record only categorical events (for example "house viewed", "house opened", "alert mark viewed", "source link opened", "houses dismissed", with the term as a category); it MUST NOT record any rate value, amount, name, address, or free text.
- **FR-020**: Any setup the feature needs beyond the existing rate agent (a new data source, permission or key) MUST be documented in a Spanish `INSTRUCCIONES-*.md` with verifiable steps, and that file MUST NOT be publicly downloadable.
- **FR-021**: Automated checks MUST cover: both houses render with a rate and term; the houses and the fixed block agree; the stale, failed-refresh and no-data states; the alert mark from an alert and none without one; the launch gate (hidden before launch); dismiss and keyboard/close behavior; and the wording rules (no advice, no prediction, no unearned "real time").

### Key Entities *(include if feature involves data)*

- **Rate House**: One floating icon for a term (15-year or 30-year). Attributes: term, visible rate, change since previous reading, last-updated date/time, status (active / not refreshed / not available), alert mark (present or not), dismissed state for the current visit.
- **Rate Reading**: One published observation of a mortgage rate for a term (same entity as feature 004): rate value, date the source published it, date retrieved, source, previous reading.
- **Rate Source**: A published measure that sets or reflects mortgage rates (same entity as 004): name, what it measures, publishing rhythm, link, whether its figures may be displayed, headline vs supporting signal.
- **Lender Link**: A link to a big lender's own public rate page. Attributes: lender name, destination page, owner-approved (yes/no). Never carries a rate value.
- **Rate Alert**: A notice that something important changed (same entity as 004): term or event, direction, size, date detected, source, status.
- **Details Panel**: The panel opened from a house, showing the reading, its sources, the Fed context and the disclaimer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can read the 30-year and 15-year rates within 3 seconds of the page finishing loading, without scrolling, tapping or hovering, on both a phone and a desktop screen.
- **SC-002**: On 100% of checked screen sizes (phone portrait, phone landscape, tablet, desktop), the houses stay visible during a full-page scroll, cover 0 other floating widgets or navigation items, are hidden whenever a form field has focus, and never hide the last content of the page.
- **SC-003**: In 100% of test cases where a newer reading is published, the houses show the new rate, date and change within one page load, and the houses and the fixed block show identical figures.
- **SC-004**: In 100% of failed-refresh and no-data test cases the houses show an honest not-refreshed or not-available state — 0 invented, estimated, example or unsourced numbers.
- **SC-005**: 100% of rate figures shown on the houses and in their panel name a source and link to it; 0 figures shown from any source outside the approved set; 0 lender figures shown (lenders appear only as links).
- **SC-006**: 0 occurrences of advice, prediction or unearned "real time"/"live" wording ("compra ya", "espera", "es buen momento", "bajarán", "en vivo" for a weekly figure) on the houses, alert mark or panel, verified by automated wording checks.
- **SC-007**: 100% of the houses' functions (open panel, close, dismiss) are usable with keyboard only, and a screen reader announces term, rate, updated date and status for both houses.
- **SC-008**: Analytics for the houses contain 0 numeric rate values, amounts or free text; only categorical events.
- **SC-009**: Qualitative: in a small check with Spanish-speaking readers, at least 8 of 10 correctly say that the two houses show the 15-year and 30-year mortgage rates and that they are national reference figures, not their personal rate.

## Assumptions

- **Complements, does not replace, feature 004.** The floating houses are a new, always-visible presentation of the same Rate Watch Agent; the fixed block further down the page stays as the full explanation (sources, schedule, alerts). Reworking the block itself is out of scope.
- **Same data, same launch.** The houses reuse the rate agent's published reading, alerts, thresholds and launch gate; they add no new data source or pipeline (Clarifications, 2026-09-21). A daily lender or market-index feed is a possible later upgrade, only after the owner obtains written permission or a licensed feed.
- **"Real time" is honored as freshness, not as a live ticker.** The houses show the latest published reading with its true date and the daily watching of the Treasury yield and the Fed; the wording never promises a live rate.
- **Lender links.** The owner picks which big lenders are linked and confirms each link before launch; links go to the lender's own public rates page, open in a new tab, and carry no referral or tracking parameters.
- **"Agente activo" means a visible working status plus honest freshness.** It does not mean a chatbot; talking with the assistant Zyron about rates is out of scope.
- **Placement.** Default: houses float in the bottom-left corner (the assistant chat launcher already occupies the bottom-right), stacked vertically or side by side depending on width, and collapse to a compact form when space is tight. The final position is confirmed with the owner before launch.
- **Overlap (adjusted during planning, 2026-09-21).** A floating element cannot promise to cover nothing on a small screen, so the guarantee is: small, in a corner, out of the way of other floating widgets and navigation, hidden while typing in a field or while a full-screen tool is open, dismissible, and never trapping the page's last content.
- **"Activo" needs proof.** The agent's status is shown as active only when the page can show the agent really checked recently; this needs one extra public timestamp (the time of the agent's last successful check) added to the existing rate data. It reveals no other run detail.
- **Scope of terms.** Only the national **30-year fixed** and **15-year fixed** rates. FHA/VA/USDA-specific, ARM, jumbo, state-level and personalized rates are out of scope.
- **Only the Buy-a-House page.** The houses appear on Comprar casa only; showing them on other pages is out of scope for this version.
- **National averages, not quotes.** Consistent with the project's honesty rule, the houses never present a rate as an offer, approval or the visitor's own rate.
- **Language.** Spanish first; text in other languages follows the "pending native review" rule for AI-made translations.
- **Ownership.** The owner approves the final source list, the wording and the placement before the houses go public.
