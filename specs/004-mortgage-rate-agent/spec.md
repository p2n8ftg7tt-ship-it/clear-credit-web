# Feature Specification: Mortgage Rate Watch Agent (Buy-a-House page)

**Feature Branch**: `004-mortgage-rate-agent` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "hagamos un agente n la pagina de comprar casa, que se mantega activo revisando toda la semana la tasa de interes de la hipoteca a 15 y 30 anos. y que la actualicedos veces por semana (lunes y martes) y de haber algun cambio importante que lo informe. revisando todas las fuentes que dictan las atasas en USA"

In plain words: on the **Comprar casa** page, a "rate watch" agent that (1) keeps watching U.S. mortgage rates all week for the **15-year** and **30-year** fixed loans, (2) publishes an updated reading on the page **twice a week, Monday and Tuesday**, and (3) **tells the visitor when something important changes**, based on the sources that actually set or reflect U.S. mortgage rates.

## What already exists (checked 2026-09-21)

| Finding | Evidence |
|---------|----------|
| The Buy-a-House page already contains styling for a "rate watch" block (agent icon, "active" status pill, checklist, delivery-time card, source links) but **no markup uses it** — the block was never built. | `comprar-casa.html` defines `.rate-watch-section`, `.rate-agent-title`, `.rate-status`, `.rate-checklist`, `.rate-delivery`, `.rate-source-links` in its `<style>`; no element in the page uses a `rate-*` class. |
| The **Buy-a-Car** page already has a working rate agent (state map with new/used auto APRs, "last updated" date, source attribution, automated refresh). Mortgage rates have nothing equivalent. | `README.md` "Agente de tasas"; `rate-agent.js`, `auto-rates.js`, `auto-rates.json`. |
| The only mortgage rates on the page today are **hand-typed example numbers** (6.5% FHA, 6.9% conventional) in the FHA-vs-conventional comparator, labeled "Las tasas son ejemplos, no ofertas". | `comprar-casa.html`, fields `cmpTasaFha` / `cmpTasaConv` and the note `.cmp-nota-tasas`. |
| Project rules that shape this feature: any figure that is not the user's own calculation must carry a source and read as an educational reference; analytics may record only categorical events; nothing may be mentioned to the public until its setup steps are documented and done; every legal/numeric fact lives in one source. | `.specify/memory/constitution.md` principles I, II, III, IV and "Documentación junto al cambio". |

## Clarifications

### Session 2026-09-21

- Q: When the agent detects an important rate change, how should people be told? → A: D — an alert on the Comprar casa page **and** a site-wide banner on the site's other pages. Emails or messages to visitors are still out of scope.
- Q: What size of move in the 15- or 30-year rate should count as an "important change"? → A: B — **0.125 percentage points (1/8 point) or more** versus the last published reading. Still adjustable by the owner (FR-014).
- Q: Which source should the headline 15- and 30-year numbers come from? → A: A — the **weekly national survey (Freddie Mac)** is the headline for both terms; the 10-year Treasury yield and Federal Reserve target-rate changes are supporting signals (the daily-index candidate was later dropped from v1, see the source-list clarification below) that can raise an alert but do not replace the headline number.
- Q: When a scheduled run is missed or a source fails, how should the owner find out? → A: A — an **owner-only status view** that the owner opens and checks; no email or other message is sent to the owner. (Visitors still see the honest "not refreshed" label from FR-008, so a missed run is never hidden from the public.)
- Q: Should a Federal Reserve rate decision raise an alert on its own? → A: B — yes, but only when the Fed **changes its target rate** (cut or hike). The alert states the fact and notes mortgage rates are not set directly by the Fed; a "no change" decision raises nothing.
- Q: (from the 2026-09-21 analysis, finding F1) Should the spec's source list match what can actually be used? → A: Yes — the v1 sources are the weekly Freddie Mac survey (headline), the 10-year Treasury yield and the Federal Reserve's target rate. The daily mortgage-rate index (Mortgage News Daily) and weekly application data (MBA) are not used in v1 because their terms could not be verified; adding either needs written permission or a licensed feed (FR-015, FR-018).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See today's reference rates for 15- and 30-year loans, with source and date (Priority: P1)

A Spanish-speaking home buyer opens **Comprar casa** and, in a clearly labeled "Agente de tasas" block, sees the current national reference rate for the **30-year fixed** and the **15-year fixed** mortgage, how each moved compared with the previous reading, the date of the reading, and the source(s) it comes from. The block states plainly that these are national averages for educational reference — not an offer, not an approval, and not the rate the visitor will be quoted.

**Why this priority**: This is the core value and the smallest thing that is useful on its own. Without a visible, dated, sourced figure there is nothing for the agent to "update" or "inform" about. It also replaces the invented example numbers as the place the visitor learns what rates roughly look like today.

**Independent Test**: Open the page with the agent's data present. Confirm both terms (15 and 30 years) show a rate, a change versus the previous reading, a "last updated" date, and at least one named source with a link; confirm the disclaimer is visible. Delivers value even if alerts and the schedule are not built yet (the figures can be loaded by hand).

**Acceptance Scenarios**:

1. **Given** verified rate data exists, **When** a visitor opens the page, **Then** the block shows the 30-year and 15-year rates, the change since the previous reading (up / down / unchanged, in percentage points), the reading date, and the source name(s) with links.
2. **Given** the block is shown, **When** the visitor reads it, **Then** the text says these are national averages for reference, not an offer or approval, and does not tell the visitor what to do (no "lock now", "wait", or "it's a good time").
3. **Given** the visitor is on a phone-width screen, **When** the block renders, **Then** all figures, the date and the source links are readable without horizontal scrolling.

---

### User Story 2 - Rates are refreshed on Monday and Tuesday, and the page says so honestly (Priority: P1)

The agent publishes a refreshed reading on **Mondays and Tuesdays**. The block tells the visitor when it was last refreshed and when the next refresh is due. If a scheduled refresh could not be completed, the page keeps the last verified figures, marks them as **not yet refreshed**, and never shows an invented or estimated number.

**Why this priority**: The user's explicit rule is "update twice a week (Monday and Tuesday)". Being honest about freshness is a project principle: a rate that silently goes stale misleads people making a very large money decision.

**Independent Test**: With a Monday reading and a Tuesday reading available, confirm the page shows the Tuesday reading after it is published and its date is correct. Then simulate a failed Tuesday refresh and confirm the page still shows Monday's figures, labeled as such, with no fabricated value.

**Acceptance Scenarios**:

1. **Given** it is Monday and the refresh succeeds, **When** the visitor opens the page, **Then** the displayed date is that Monday and "next refresh" says Tuesday.
2. **Given** it is Tuesday and the refresh succeeds, **When** the visitor opens the page, **Then** the displayed date is that Tuesday and "next refresh" says next Monday.
3. **Given** a scheduled refresh failed or a source was unreachable, **When** the visitor opens the page, **Then** the block shows the last verified figures with their original date and a visible "no se pudo actualizar / not refreshed" notice, and no number that was not published by a source.
4. **Given** no reading has ever been published, **When** the visitor opens the page, **Then** the block says honestly that the reference rate is not available yet instead of showing placeholder numbers, and the rest of the page works normally.

---

### User Story 3 - Be told when something important changes (Priority: P1)

The agent keeps checking the rate sources **every day of the week**, not only on publish days. When it detects an **important change** (a move in the 15- or 30-year rate of at least the agreed threshold, or a change to the Federal Reserve's target rate), the Comprar casa page shows a clear **alert** stating what changed, by how much, when it was detected, and from which source — until the next scheduled reading supersedes it. The same alert also appears as a short **banner on the site's other pages**, so a visitor who is not on Comprar casa still finds out, with a link back to the full alert.

**Why this priority**: The user asked for this explicitly ("de haber algún cambio importante que lo informe"), and it is what makes this an *agent* and not a static table. A buyer with a purchase in progress cares most about a sudden move.

**Independent Test**: Feed the agent a reading that differs from the previous one by more than the threshold, on a day that is not Monday or Tuesday, and confirm the alert appears on Comprar casa and the banner appears on other pages, both with the correct direction, size, date and source. Feed a reading that differs by less than the threshold and confirm neither appears.

**Acceptance Scenarios**:

1. **Given** the 30-year rate moved by at least the alert threshold since the last published reading (in the headline weekly figure, or in a supporting daily signal), **When** the visitor opens the page, **Then** an alert names the term, the direction (up/down), the size in percentage points, the date it was detected and the source.
2. **Given** the change is smaller than the threshold, **When** the visitor opens the page, **Then** no alert is shown (only the normal change indicator from User Story 1).
3. **Given** an alert was raised mid-week, **When** the next Monday/Tuesday reading is published, **Then** the alert is replaced or cleared according to the new reading, and never left showing outdated information.
4. **Given** an alert is shown, **When** the visitor reads it, **Then** it describes *what changed* and does not say what the visitor should do (no advice, no prediction, no guarantee).
5. **Given** an alert is active, **When** a visitor opens any other page of the site, **Then** a banner shows the term, direction, size and date, with a link to the full alert on Comprar casa.
6. **Given** the banner is shown, **When** the visitor dismisses it, **Then** it stays hidden for that visitor until a *new* alert is raised, without the visitor signing in.
7. **Given** no alert is active (or it was cleared), **When** a visitor opens any page, **Then** no banner is shown.
8. **Given** the Federal Reserve changes its target rate, **When** the visitor opens the page, **Then** an alert states the change as a fact and says mortgage rates are not set directly by the Fed; **Given** the Fed leaves the rate unchanged, **Then** no alert is raised.

---

### User Story 4 - Understand where the numbers come from (Priority: P2)

The visitor can see, for each figure, which source(s) it comes from and what that source measures (for example: the weekly national average of lender offers versus the daily 10-year Treasury yield versus the Federal Reserve's target rate), with a link to the original. The set of sources covers the main public measures that reflect or drive U.S. mortgage rates and can be used under their terms, so no single source is presented as "the" rate.

**Why this priority**: The user asked to review "all the sources that dictate rates in the USA". Showing where numbers come from builds the trust that is the product, and lets a curious visitor verify. It is P2 because a single sourced figure (Story 1) already delivers the essential value.

**Independent Test**: Open the sources area and confirm each listed source has a name, a one-line plain-Spanish description of what it measures, its publishing rhythm, and a working link; confirm any figure on the page can be traced to one of them.

**Acceptance Scenarios**:

1. **Given** the block is shown, **When** the visitor opens the sources area, **Then** they see each source used, what it measures and how often it is published.
2. **Given** two sources disagree by a small amount for the same day, **When** the block shows the figure, **Then** it says which source the headline number comes from and does not silently average or blend them.
3. **Given** a source's terms do not allow showing its figures on the site, **When** the sources area is built, **Then** that source is used only as a reason to raise an alert or is left out, and is never displayed in breach of its terms.

---

### User Story 5 - The site owner can tell the agent is healthy (Priority: P3)

The person who owns the site can see, without reading code, whether the agent ran on its last scheduled days, which sources answered, and whether any alert is currently active. The owner checks this status view themselves; no message is sent to the owner (Clarifications, 2026-09-21). Because of that, the view shows at a glance how long ago the last successful run was, and visitors always see the honest "not refreshed" label (FR-008) if a run is missed, so staleness is never hidden from the public.

**Why this priority**: It keeps the promise of Story 2 sustainable, but visitors already get value from Stories 1–3 without it.

**Independent Test**: Skip a scheduled run and confirm the owner-facing status shows the miss; run normally and confirm it shows success with the sources that answered.

**Acceptance Scenarios**:

1. **Given** the agent ran on Monday and Tuesday, **When** the owner checks status, **Then** they see both runs, their times, and which sources answered.
2. **Given** a scheduled run did not happen or a source failed, **When** the owner checks status, **Then** the miss/failure is visible with the affected source(s).

---

### Edge Cases

- **Sources publish on different days.** The main national weekly average is normally published mid/late week, so a Monday or Tuesday reading may repeat the previous week's number. The page must show the *publication date of the underlying figure* so a repeated number is not mistaken for a stale agent.
- **A source is unreachable or changes its format.** The agent keeps the last verified figure, marks it not refreshed, records the failure for the owner, and never fills the gap with an estimate.
- **Sources disagree materially** (for example one shows the 30-year up sharply and another flat). The page shows the headline source's figure, and the disagreement is recorded for the owner; it must not be averaged into a new "invented" number.
- **Holiday or day with no publication.** No new figure is published by the source; the page shows the latest published one with its true date.
- **Banner on a page with a fixed header or its own notices.** The banner must not cover navigation, forms or another notice; on very small screens it stays short (one line plus link).
- **Visitor dismissed an old alert, then a new one is raised.** The banner returns for the new alert; a dismissal never silences future alerts.
- **Fed changes its rate but mortgage rates barely move.** The Fed-triggered alert still appears (it is a checkable fact), worded per FR-032; the 15- and 30-year figures shown next to it are unchanged until the next weekly publication.
- **Alert flapping.** A rate that bounces back and forth around the threshold must not produce a stream of contradictory alerts; an alert stays until the next scheduled reading or until the move reverses beyond the threshold.
- **Implausible reading.** A value far outside a sane range (for example a typo-like jump of several points in a day) is not published automatically; it is held and flagged for the owner.
- **Visitor has no JavaScript, is offline, or the data cannot be loaded.** The rest of the Buy-a-House page (roadmap, loan types, comparator) works as before, and the block shows an honest "not available right now" message.
- **Visitor uses another language.** The page is Spanish-first; any text in another language must not contradict the Spanish original.
- **The FHA-vs-conventional comparator still shows example rates.** The example numbers must stay clearly labeled as examples and must not be presented as the agent's reference rate.

## Requirements *(mandatory)*

### Functional Requirements

**Display**

- **FR-001**: The Buy-a-House page MUST show a rate-watch block with the current national reference rate for the **30-year fixed** and the **15-year fixed** mortgage.
- **FR-002**: For each term the block MUST show the change versus the previous reading (direction and size in percentage points), the date of the reading, and the source of the figure.
- **FR-003**: The block MUST state that figures are national averages for educational reference, not an offer, approval, or quote, and MUST NOT tell the visitor what to do, predict future rates, or say whether it is a good time to buy, lock, or refinance.
- **FR-004**: The block MUST show when it was last refreshed and when the next refresh is due.
- **FR-005**: The block MUST be readable and usable at phone width, and MUST reuse the page's existing visual style.

**Schedule and freshness**

- **FR-006**: The agent MUST publish a refreshed reading on **Mondays and Tuesdays**.
- **FR-007**: The agent MUST check the rate sources **on every day of the week** so that an important change between publish days is detected.
- **FR-008**: If a refresh fails, the page MUST keep the last verified figures, label them as not refreshed with their original date, and MUST NOT show a value no source published.
- **FR-009**: If no verified reading exists yet, the block MUST say so honestly and MUST NOT show placeholder or example numbers as if they were current.

**Important-change alerts**

- **FR-010**: The agent MUST raise a visible alert on the page when the 15-year or 30-year rate moves by at least the alert threshold versus the last published reading (FR-029 for supporting signals), or when the Federal Reserve changes its target rate (a cut or a hike). A Fed decision to leave the rate unchanged MUST NOT raise an alert.
- **FR-032**: A Fed-triggered alert MUST state the decision as a fact (what the Fed changed, by how much, on what date) and MUST say that mortgage rates are not set directly by the Fed; it MUST NOT predict what mortgage rates will do next.
- **FR-011**: An alert MUST state the term, direction, size in percentage points, date detected and source, and MUST describe only what changed.
- **FR-012**: Changes below the threshold MUST NOT raise an alert.
- **FR-013**: An alert MUST be replaced or cleared by the next scheduled reading and MUST NOT remain showing outdated information; repeated small oscillations around the threshold MUST NOT produce contradictory alerts.
- **FR-014**: The alert threshold MUST be a single, easily changed value that the site owner can adjust without touching the page layout.
- **FR-026**: While an alert is active, the site's other public pages MUST show a short banner with the term, direction, size and date, linking to the full alert on Comprar casa. The banner MUST follow the same wording rules as FR-011 (what changed only; no advice or prediction).
- **FR-027**: The banner MUST be dismissible by the visitor; a dismissal MUST last until a new alert is raised, MUST work without sign-in, and MUST be remembered only in the visitor's own browser.
- **FR-028**: The banner MUST disappear on every page when the alert is cleared or superseded (FR-013), and MUST NOT block or push down page content in a way that hides forms or navigation, including at phone width.

**Sources**

- **FR-015**: The agent MUST draw on published measures that set or reflect U.S. mortgage rates, subject to each source's terms of use (FR-018). The v1 set is: the weekly national mortgage-rate survey average (15- and 30-year fixed; the headline), the 10-year U.S. Treasury yield (the benchmark mortgage rates track), and the Federal Reserve's target rate. A daily mortgage-rate market index and weekly mortgage-application data are candidates that are **not used in v1**, because their terms of use could not be verified as permitting this use; adding either requires the owner to first obtain written permission or a licensed feed.
- **FR-016**: Every figure shown MUST name its source and link to it; the sources area MUST describe what each source measures and how often it publishes.
- **FR-017**: The agent MUST NOT blend or average different sources into a new number; the headline figure for both terms MUST come from the weekly national survey (Freddie Mac), and disagreements between sources MUST be recorded for the owner.
- **FR-029**: The 10-year Treasury yield and Federal Reserve target-rate changes MUST act only as supporting signals: they may raise an alert (naming that source and what it measured) but MUST NOT change the headline 15- or 30-year figure. An alert raised from a supporting signal MUST say the headline weekly figure has not yet been republished, so it is not read as the new official average.
- **FR-030**: Each Monday/Tuesday reading MUST show the date the weekly survey figure was published, so a number that repeats from the previous days is visibly the same publication and not a stale agent.
- **FR-018**: A source whose terms do not permit displaying its figures MUST NOT have its figures displayed; it may only inform alerts or be omitted.
- **FR-019**: The agent MUST NOT publish an implausible reading automatically; it MUST hold it and flag it for the owner.

**Owner visibility**

- **FR-020**: The owner MUST be able to see, in an owner-only status view and without reading code, the outcome of each run (ran / missed, sources that answered or failed, readings held as implausible, whether an alert is active) and the time of the last successful run.
- **FR-031**: The status view MUST be visible only to the owner (not to visitors or other signed-in users), and the agent MUST NOT send the owner emails or other messages about run outcomes in this version.

**Project rules**

- **FR-021**: Analytics for this block MUST record only categorical events (for example "block viewed", "alert viewed", "banner viewed", "banner dismissed", "banner link opened", "source link opened"); it MUST NOT record any figure, amount, name, address, or free text.
- **FR-022**: Loading and displaying the block MUST NOT require the visitor to sign in or send any personal or financial data; the rest of the Buy-a-House page, and every page that can show the banner, MUST keep working if the block, banner or their data cannot load (a failed banner shows nothing, never an error).
- **FR-023**: Any setup the feature needs (accounts, keys, schedules, permissions) MUST be documented in a Spanish `INSTRUCCIONES-*.md` with verifiable steps, and the block MUST NOT be shown to the public until those steps are done; that instructions file MUST NOT be publicly downloadable.
- **FR-024**: Any mortgage-rate figure that appears elsewhere on the site (for example if the assistant Zyron or another page quotes it) MUST derive from the same published reading so there is a single truth.
- **FR-025**: Automated checks MUST cover: the change/threshold logic (alert vs no alert, clearing, no flapping, Fed change vs Fed hold, supporting-signal alerts not altering the headline figure, banner shown/dismissed/cleared), the stale/failed-refresh behavior, the implausible-value hold, and the wording rules (no advice, no prediction).

### Key Entities *(include if feature involves data)*

- **Rate Reading**: One published observation of a mortgage rate. Attributes: term (15-year or 30-year fixed), rate value, the date the *source* published it, the date the agent retrieved it, the source it came from, and the previous reading it is compared with.
- **Rate Source**: A published measure that sets or reflects mortgage rates. Attributes: name, what it measures, how often it publishes, link, whether its figures may be displayed, and whether it is the headline source for a term or only a supporting/alert signal.
- **Rate Alert**: A notice that something important changed. Attributes: term (or event), direction, size in percentage points, date detected, source, status (active / superseded / cleared).
- **Agent Run**: One scheduled or daily check. Attributes: run date/time, day type (publish day or watch-only), sources that answered, sources that failed, readings published or held, alert raised or not.
- **Alert Threshold**: The single owner-adjustable value (in percentage points) that decides what counts as an important change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can find the 30-year and 15-year reference rates, their date and their source within 5 seconds of reaching the rate-watch block, without scrolling sideways on a phone.
- **SC-002**: On 100% of Mondays and Tuesdays in a 4-week trial, the page shows a reading dated that day, or an explicit "not refreshed" notice — never a silently stale number.
- **SC-003**: When a change larger than the threshold occurs on any day of the week, the alert is visible on the page by the end of the following day in 100% of trial cases; no alert is shown for changes below the threshold in 100% of trial cases.
- **SC-003b**: When an alert is active, the banner appears on 100% of the pages in the agreed banner list and on none of the excluded pages; after it is dismissed it does not reappear for that visitor until a new alert is raised.
- **SC-004**: 100% of figures shown on the block name a source and link to it; 0 figures shown are estimated, blended or unsourced.
- **SC-005**: When a source fails or the data cannot load, 100% of test cases still display the rest of the Buy-a-House page normally and show an honest message in the rate block — 0 blank or broken blocks.
- **SC-006**: 0 occurrences of advice or prediction wording ("compra ya", "espera", "es buen momento", "bajarán") in the block or any alert, verified by automated wording checks.
- **SC-007**: The site owner can tell within 1 minute whether the last Monday and Tuesday runs succeeded and which sources answered.
- **SC-008**: Analytics for the block contain 0 numeric rate values, amounts, or free text; only categorical events.
- **SC-009**: Qualitative: in a small check with Spanish-speaking readers, at least 8 of 10 correctly say what the two numbers are (national averages, for reference) and that they are not a personal quote.

## Assumptions

- **"Inform" means on the site (confirmed).** "Que lo informe" is delivered as an alert on the Buy-a-House page plus a dismissible banner on the site's other public pages (Clarifications, 2026-09-21). Sending emails/WhatsApp/push notifications to visitors or subscribers is **out of scope** for this version (it would need consent, unsubscribe and privacy work); the owner-only status view in Story 5 covers the owner's need to know (the owner looks; nothing is pushed to them).
- **Which pages show the banner.** Default: the public pages that visitors browse (home, tools, credit, buy-a-car, letters, etc.); not the sign-in, account and admin pages, the legal pages (terms, privacy), or checkout/payment screens, where an unrelated banner would distract. The owner confirms the final list before launch.
- **"Important change" threshold (confirmed).** An important change is a move of **0.125 percentage points (one-eighth of a point) or more** in either term versus the last published reading, or a change (cut or hike) to the Federal Reserve's target rate. The owner can change the number later (FR-014).
- **Watch every day, publish twice a week.** The headline numbers and "last updated" date refresh on Monday and Tuesday; between those days the agent only watches and may raise an alert, it does not silently change the headline figures.
- **What "all the sources" means.** No single feed is "the" rate, and some commercial sources restrict reuse. The agent watches the v1 sources listed in FR-015 and honors each source's terms (FR-018); Mortgage News Daily and MBA data are left out of v1 until their terms allow use (owner decision G-SRC). The headline figure is the weekly national survey (Clarifications, 2026-09-21); the others are supporting signals (FR-029). The exact final list, publishing days and licensing are verified during planning, not assumed here. The weekly survey is understood to publish once a week (mid/late week), so Monday/Tuesday readings will often carry that week's latest published value (FR-030).
- **National averages, not personal quotes.** Rates are U.S.-wide reference figures for 30- and 15-year **fixed** loans. State-by-state, FHA/VA/USDA-specific, ARM, jumbo and personalized rates are out of scope.
- **Language.** Spanish first, consistent with the page; translations of the block's fixed text follow the project rule that AI-made translations are marked pending native review. Adding the assistant Zyron quoting the rate is out of scope for this version, but FR-024 keeps any future quote consistent.
- **Comparator unchanged.** The FHA-vs-conventional comparator keeps its editable example rates; pre-filling it from the reference rate is out of scope for this version.
- **Same spirit as the auto agent.** The car page's rate agent (dated figures, source attribution, automated refresh, honest fallback) is the reference for behavior and tone; how it is built is decided in planning.
- **Ownership.** The site owner approves the source list, the threshold value and the public wording before the block goes live (constitution: no mention to the public before setup is documented and done).
