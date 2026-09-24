# Feature Specification: Themora Digital Score (TDS) on "¿Aparezco?"

**Feature Branch**: `007-themora-digital-score` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "aplica un nuevo indice sobre el impacto (salud) digital de los diferentes negocio en la web, implementalo en la pagina aparezco "C:\Users\drcor\Documents\TDS\deepseek_python_20260922_aa6acf.py" y "C:\Users\drcor\Documents\TDS.docx""

In plain words: replace the current, simple "X de 100 en presencia digital" number on **¿Aparezco?** with a named, explained index — the **Themora Digital Score (TDS), Índice de Salud Digital** — built on five weighted pillars, with an adjusted-rating rule so that "5.0 stars from 1 review" is not treated as proof of an excellent reputation, a health band (color + name) the owner can understand at a glance, and a breakdown that shows *where* the business is weak.

## What already exists (checked 2026-09-23)

| Finding | Evidence |
|---------|----------|
| **¿Aparezco?** already runs a real search (Google Places; Apple Maps optional) and returns a 0–100 `puntaje` plus a one-row-per-parameter scorecard. The score is "percent of weight met" over 7 pass/fail checks (listing exists 25, rating ≥ 4.5 20, reviews ≥ 50 15, appears in category top 3 20, full hours 10, photos ≥ 8 5, website 5, Apple 10 when configured). Checks that do not apply are left out of the total instead of counting as zero. | `netlify/functions/revisar-negocio.js` `evaluarParametros()`; `aparezco.html` `#apScore`. |
| The search already collects: rating, review count, website link, full-hours flag, photo count, position (1–10) when searching by what the business sells, whether it is found by name, business status, and the average rating/review count of up to 5 competitors from the same search. | `consultarGoogle()`, `calcularCompetencia()`. |
| The data source **does not expose**: whether a listing is claimed by its owner, the owner's reply rate to reviews, or the date of the owner's last activity. It returns at most a small, capped number of photos (about 10) and at most 5 review texts, but the full review total. | Places API field set used in `revisar-negocio.js`; noted in `C:\Users\drcor\Documents\TDS.docx`. |
| The analytics event for a result currently sends the raw score number (`puntaje`). Project rules allow only categorical properties in analytics. | `aparezco.html` line ~459 `stat('aparezco-resultado', { … puntaje … })`; constitution principle II. |
| Search is limited to 5 per connection per day; the page works without AI and without an account. | `revisarLimite()`; constitution III. |

**Source methodology** (the user's two files):

- **`deepseek_python_20260922_aa6acf.py`** — the concrete TDS: five pillars **Reputación 30 %, Visibilidad 25 %, Fundamentos 20 %, Completitud 15 %, Actividad 10 %**; a Bayesian-adjusted rating (confidence constant 10, prior = city/category average, default 4.7); a logarithmic review-volume score (goal 50 reviews, capped at 100); reputation = 60 % adjusted rating + 40 % volume; visibility by position (top 3 = 100, then −15 per position through 10, else 0) multiplied by 0.3; fundamentals = average of claimed / website / full hours; completeness = 100·(1 − e^(−0.05·photos)); activity = 100·reply rate·e^(−0.01·days inactive); a "reality multiplier" (0 with no listing and no reviews, 0.5 if not claimed, 1 otherwise); bands **0–39 Invisible (rojo), 40–59 Vulnerable (naranja), 60–79 Saludable (amarillo), 80–94 Fuerte (verde), 95–100 Dominante (azul)**.
- **`TDS.docx`** — the discussion behind it, including rules this spec adopts: an unknown value must never silently become zero ("evaluación incompleta"); the comparison group and its size must be shown; conclusions about visibility must be limited to the searches actually made; "no website linked" only proves the listing has no link; claims like "te está costando clientes" need data we do not have; **buying Themora's services must never grant points**. It also contains an alternative weighting (Visibilidad 30 / Reputación 25 / Información 20 / Contacto 15 / Actividad 10) and softer band names; this spec uses the `.py` version, which is the one named "TDS".

## Clarifications

### Session 2026-09-23

- Q: Replace the current 7-check scorecard entirely, or keep its table? → A: B — the TDS and the five pillars go on top; the existing per-parameter table stays below as "Lo que encontramos" (your value vs. the goal), **without its own score**. Only one number is shown.
- Q: Visibility rule (the `.py` multiplies every value by 0.3)? → A: B — top 3 when searching by what it sells = 100; positions 4–10 = 100 − 15 per position after 3; found by exact name but not by category = 30; not found = 0.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See my TDS and my health band (Priority: P1)

A business owner (often Spanish-speaking, not technical) types their business name, city and what they sell on **¿Aparezco?**. The result opens with the **Themora Digital Score** as a large number out of 100, its **band** by name and color (for example "Vulnerable · naranja"), and one plain sentence that says what that band means **in terms of what was observed**, not predictions about lost customers.

**Why this priority**: This is the index itself — the smallest slice that replaces the current number with a named, consistent, explainable score.

**Independent Test**: Search a business with known data (or feed recorded search data). Confirm the number, band name and color match the rules in FR-001 to FR-012 and that the sentence contains no claim outside what was observed.

**Acceptance Scenarios**:

1. **Given** a business found on Google Maps with 1 review of 5.0 stars, no website linked, incomplete hours, 0 photos, and not appearing when searching by what it sells, **When** the result loads, **Then** the TDS and band follow FR-001–FR-012 exactly, and the reputation part is **lower** than it would be for the same business with 50 reviews at 5.0 stars.
2. **Given** a business with 100 reviews averaging 4.7 and one with 1 review of 5.0, all else equal, **When** both are scored, **Then** the first has the higher reputation pillar.
3. **Given** a business that is not found by name at all, **When** the result loads, **Then** the TDS is 0, the band is "Invisible", and the sentence says we did not find a listing **for the searches made** (name + city), with the next step to create one.
4. **Given** any result, **When** it is shown, **Then** the band sentence never states that the business "está perdiendo clientes", "no existe", "regala clientes", percentages of lost customers, or similar claims (constitution principle I).

---

### User Story 2 - Understand where I am weak: the five-pillar breakdown (Priority: P1)

Under the score, the owner sees the **five pillars** — Reputación, Visibilidad, Fundamentos, Completitud, Actividad — each with its own 0–100 value, its weight, and **why** it has that value in one line ("Tienes 5.0★ pero con 1 sola reseña; con pocas reseñas contamos tu calificación cerca del promedio de tu zona (4.6★, 5 negocios)").

**Why this priority**: A single number without the "why" is the problem the docx calls out. The breakdown is what lets the owner act, and it is where honesty about the data is shown.

**Independent Test**: For a recorded search, confirm each pillar value, weight and explanation line, and that the weighted pillars reproduce the TDS.

**Acceptance Scenarios**:

1. **Given** a result, **When** the breakdown is shown, **Then** each pillar shows its value 0–100, its weight, and a one-line reason using the business's real figures.
2. **Given** a pillar whose data the source does not provide (see FR-008), **When** the breakdown is shown, **Then** that pillar (or the missing part of it) is shown as **"No lo pudimos comprobar"**, not as 0, and the result is labeled **"Evaluación parcial"** with how many of the five pillars were fully measured.
3. **Given** the reputation pillar used a comparison group, **When** it is shown, **Then** it states how many comparable businesses were used and from which search, or that a fixed reference was used because there were too few.
4. **Given** a phone-width screen, **When** the breakdown renders, **Then** all five pillars are readable without horizontal scrolling.

---

### User Story 3 - Top 3 actions to raise my score (Priority: P2)

Below the breakdown the owner sees **up to three actions**, ordered by how many TDS points each would add **according to the formula**, e.g. "Agrega tu sitio web a tu ficha: +7 puntos". Each action is something the owner can do; the points come from recomputing the score with that condition changed.

**Why this priority**: Turns the score into next steps (the docx's "tres acciones prioritarias"). It depends on Stories 1–2 but is useful without the simulator.

**Independent Test**: For a recorded search, change one input at a time, recompute, and confirm the listed actions and point gains match and are ordered largest first.

**Acceptance Scenarios**:

1. **Given** a result with missing items, **When** actions are listed, **Then** at most three are shown, sorted by points gained, each gain equal to the recomputed TDS minus the current TDS (rounded to whole points).
2. **Given** an action whose effect depends on data we could not verify, **When** it is listed, **Then** it says so instead of showing a point value.
3. **Given** any action text, **When** it is shown, **Then** it never says or implies that hiring Themora raises the score; the owner can do each action themselves (a link to the paid service may appear separately, as today).

---

### User Story 4 - "What if" simulator (Priority: P3)

The owner can toggle a few conditions they control — add a website, complete hours, reach N photos, reach N reviews — and see the TDS and band **recalculated instantly** on the page, clearly labeled as a simulation, without a new search.

**Why this priority**: A strong motivator suggested in both files, but it is an enhancement on top of the score, the breakdown and the actions.

**Independent Test**: Toggle each control and confirm the displayed simulated score equals the formula applied to the changed inputs; reset returns to the real result.

**Acceptance Scenarios**:

1. **Given** a result, **When** the owner toggles "Agregar sitio web", **Then** the simulated TDS updates at once, is labeled "Simulación", and the real TDS stays visible.
2. **Given** the simulator is used, **When** a toggle changes, **Then** no new search is made and no search allowance is used.

---

### Edge Cases

- **Business found but permanently closed** on the source: show the TDS with a notice that the listing is marked closed; do not hide the score.
- **No competitor data** (search by what it sells returned fewer than 3 other rated businesses): the reputation prior uses the fixed reference (FR-004) and says so.
- **Zero reviews**: adjusted rating equals the reference, volume score is 0; the reputation line says there are no reviews yet rather than showing "0.0★".
- **The "what it sells" field is empty**: visibility by category cannot be measured for a real category; follow the current behavior (the business name is used as the query) but mark visibility as partial.
- **Photo count at the source's cap**: the business is not penalized for the source's limit (FR-007).
- **Search limit reached / source not configured / search fails**: unchanged from today (limit message, "vuelve más tarde / agenda una cita", retry); no score is invented.
- **Scores on band boundaries** (39/40, 59/60, 79/80, 94/95): band follows the rounded whole-number score.
- **Rounding**: pillar values shown to whole numbers; the TDS is rounded once, at the end, and the shown pillars × weights reproduce it within ±1.

## Requirements *(mandatory)*

### Functional Requirements

**Score structure**

- **FR-001**: The result MUST show the **Themora Digital Score (TDS)**, a whole number 0–100, named "Themora Digital Score — Índice de Salud Digital", replacing the current "X de 100 en presencia digital" number on ¿Aparezco?. The existing per-parameter table MUST remain below the pillars, titled "Lo que encontramos", showing each value vs. its goal but no score of its own.
- **FR-002**: The TDS MUST be the weighted sum of five pillar values (each 0–100) with weights **Reputación 0.30, Visibilidad 0.25, Fundamentos 0.20, Completitud 0.15, Actividad 0.10**, multiplied by the reality multiplier (FR-009). When a pillar cannot be measured (FR-008), the remaining weights MUST be rescaled to sum to 1 so that missing data neither adds nor subtracts points.

**Pillar rules**

- **FR-003 Reputación**: adjusted rating = (v / (v + m))·R + (m / (v + m))·C, with v = review count, R = rating, m = 10, C = reference rating (FR-004). Volume score = 100·ln(v + 1) / ln(51), capped at 100, and 0 when v = 0. Pillar = 0.6·(adjusted rating / 5 · 100) + 0.4·volume score.
- **FR-004 Reference rating (C)**: MUST be the average rating of the comparable businesses from the same "what it sells + city" search when at least 3 of them have a rating; otherwise a fixed reference of 4.7. The result MUST state which one was used and the number of businesses behind it.
- **FR-005 Visibilidad**: MUST be based on the position of the business when searching by what it sells in the stated city: positions 1–3 = 100; positions 4–10 = 100 − 15·(position − 3); found by exact name but not in the category results = 30; not found = 0. (This departs from the literal `.py`, which multiplied every value by 0.3; the comment in the `.py` and the docx describe the 0.3 as a penalty for name-only presence.)
- **FR-006 Fundamentos**: MUST be the average of the observable items: website linked on the listing (yes/no) and full opening hours (yes/no). "Listing claimed by the owner" is not observable (FR-008) and MUST NOT count as 0.
- **FR-007 Completitud**: MUST be 100·(1 − e^(−0.05·photos)). Because the source reports photos only up to a cap, a count at the cap MUST receive full pillar credit (100) instead of the value the formula gives at the cap.
- **FR-008 Unmeasurable data**: Items the source does not provide — owner claim status, review-reply rate, days since the owner's last activity — MUST be shown as "No lo pudimos comprobar", MUST NOT be scored as 0, and MUST cause the result to be labeled **"Evaluación parcial"** with the count of fully measured pillars (e.g. "4 de 5 pilares medidos"). With today's data source the **Actividad** pillar is unmeasurable and is excluded under FR-002.
- **FR-009 Reality multiplier**: 0 when no listing is found for the business name and city; 1 otherwise. The "not claimed = 0.5" case from the `.py` MUST NOT be applied while claim status is unobservable.
- **FR-010 Apple Maps**: presence on Apple Maps (when that check is configured) MUST be shown in the result but MUST NOT change the TDS, since it is not part of the five-pillar model.

**Bands and wording**

- **FR-011**: The band MUST follow the rounded TDS: **0–39 Invisible (rojo), 40–59 Vulnerable (naranja), 60–79 Saludable (amarillo), 80–94 Fuerte (verde), 95–100 Dominante (azul)**. Color MUST NOT be the only signal (name always shown; contrast readable in light and dark contexts).
- **FR-012**: The band sentence and all pillar lines MUST describe only what was observed in the searches made (queries and city shown), and MUST NOT predict lost customers, sales or income, say the business "does not exist", or promise a result from any action (constitution principle I).

**Actions and simulator**

- **FR-013**: The result MUST list up to three actions, each with the whole-number TDS points it adds when that single input is changed to its goal and the score recomputed with the same rules; sorted by points, largest first; ties in a fixed documented order.
- **FR-014**: Buying or scheduling any Themora service MUST never add points or change any input of the score; actions MUST be doable by the owner.
- **FR-015**: (P3) The simulator MUST recompute the TDS on the page from the already-returned inputs, show it labeled "Simulación" next to the real TDS, and never trigger a new search.

**Consistency, privacy, testing**

- **FR-016**: The scoring rules MUST live in one place and be covered by automated tests, including a reference case built from the Guajiro Llc example in the source files, boundary cases for every band, the zero-review case, the capped-photos case, and the not-found case (constitution IV).
- **FR-017**: Analytics for a result MUST record only the band name, whether the evaluation was partial, and the existing categorical properties — never the TDS number, pillar values, business name or city (constitution II). This also removes today's numeric `puntaje` property.
- **FR-018**: No new data about the business MUST be stored; the score is computed per search, as today.
- **FR-019**: A short public "Cómo calculamos el TDS" explanation MUST be reachable from the result, stating the five pillars and weights, that unmeasurable items are excluded rather than counted as zero, what the comparison group is, that the weights are an initial Themora methodology not yet validated against business outcomes, and that paying Themora never changes the score.

### Key Entities

- **Search inputs**: business name, city, what it sells — as today.
- **Observed business data**: found (yes/no), rating, review count, website linked, full hours, photo count (capped by source), category position (1–10 or none), status, Apple presence (optional).
- **Comparison group**: the rated competitors from the same category search (count, average rating, average reviews) or the fixed reference when fewer than 3.
- **Pillar result**: name, weight, value 0–100 or "not measurable", one-line reason.
- **TDS result**: score 0–100, band, partial flag with measured-pillar count, multiplier applied, up to three actions with point gains.
- **Reference case**: a fixed set of observed data (Guajiro Llc) with its expected pillars, TDS and band, used by tests and by the methodology page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For 100 % of the reference and boundary test cases, the displayed TDS, band and pillar values equal the values computed by hand from the documented rules (±1 point from rounding).
- **SC-002**: A business with 1 review at 5.0★ never scores a higher reputation pillar than an otherwise identical business with 50 or more reviews at 4.7★ or more.
- **SC-003**: 0 results show a pillar as "0" for data the source did not provide; every such case shows "No lo pudimos comprobar" and the partial label.
- **SC-004**: The TDS, band and breakdown appear in the same time as today's result (no extra wait perceptible to the owner), and the simulator updates in under half a second.
- **SC-005**: In a review of all result texts across the band and edge cases, 0 sentences predict lost customers or income, or imply that buying a Themora service raises the score.
- **SC-006**: 0 analytics events contain the numeric score, pillar values, business name or city.
- **SC-007**: A first-time owner can tell which pillar is their weakest within 10 seconds of the result appearing (hallway test with 5 people; at least 4 of 5 succeed).

## Assumptions

- The `.py` file defines the TDS methodology; the docx supplies the honesty rules adopted above. Where the two conflict, this spec follows the `.py` numbers and the docx's honesty rules.
- The weights and constants (m = 10, goal 50 reviews, λ = 0.05) are Themora's initial, unvalidated methodology; validating them against real outcomes (calls, visits) is out of scope for this feature.
- The data source stays the same as today (Google Places, optional Apple Maps); no new paid data sources or owner-account connections are added, so the Actividad pillar stays unmeasurable in this version.
- Out of scope: storing score history, subscription tiers, a "TDS 90+" certification seal, paid-advertising scoring, a radar chart (the breakdown may be a list or bars; the visual form is a planning decision).
- The page stays Spanish-first like the rest of ¿Aparezco?; no new languages are added in this feature.
- The existing search limit, AI-optional suggestions, and "not configured" behavior stay as they are.
