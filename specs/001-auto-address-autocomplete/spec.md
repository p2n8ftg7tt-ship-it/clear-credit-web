# Feature Specification: Automatic Address Autocomplete

**Feature Branch**: `001-auto-address-autocomplete` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Improve the existing address autocomplete functionality. Currently, the user must check a checkbox before Google address autocomplete becomes active. I want address autocomplete to activate automatically when the user starts typing in the existing person's address field. Remove the checkbox, show Google suggestions while typing, populate the address (and city/state/ZIP when those fields exist) on selection, preserve manual entry and existing form submission, reuse the existing Google integration, hardcode no credentials, redesign nothing, touch no unrelated functionality, work on desktop and mobile."

## Current State (observed before writing this spec)

The working tree already differs from the situation described in the request:

- The letter forms on the credit page (`credito.html`) are connected to address suggestions with **no checkbox**; suggestions start as soon as the person types in "Calle y número" (`direccion-autocompletar.js`, header comment: "sin casilla").
- Some **text still describes the old opt-in behavior**, e.g. the small note next to the "Verificar dirección en Google Maps" button says the autocomplete "solo envía algo si tú lo activas", and the privacy page describes the feature as opt-in in places. That text is now inaccurate.
- The person's own address field on the collector-contact letter form (`herramientas.html`, "Tu calle y número") has **no autocomplete at all**.

This spec therefore covers the *behavior the person should experience everywhere their own address is asked for*, and treats the remaining gaps above as the work to verify or close.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Suggestions appear as I type, with nothing to switch on (Priority: P1)

A person filling in a form clicks the field for their own street address and starts typing. Address suggestions appear on their own, with no checkbox, toggle or extra step. They pick one and the address, city, state and ZIP code fields fill in.

**Why this priority**: This is the whole request. Any required opt-in step is friction and, on a phone, a real reason people give up typing a long address.

**Independent Test**: Open a form with the person's address field on a clean browser session, click the field, type at least the minimum number of characters of a real street address, and confirm suggestions appear without touching any other control. Select one and confirm the address fields are filled.

**Acceptance Scenarios**:

1. **Given** a form with the person's address field and no checkbox, **When** the person clicks the field and types a street address, **Then** a list of address suggestions appears without any prior activation step.
2. **Given** suggestions are showing, **When** the person selects one, **Then** the street field contains the chosen street and number, and the city, state and ZIP fields (where the form has them) are filled with the matching values.
3. **Given** the form previously showed a checkbox or wording about enabling autocomplete, **When** the form is displayed, **Then** no checkbox and no wording that asks the person to "turn on" or "activate" autocomplete is visible.
4. **Given** the person has just selected a suggestion, **When** they look at the form, **Then** they can still edit every filled field (for example to add an apartment or unit number).

---

### User Story 2 - Typing by hand always works (Priority: P1)

A person who ignores the suggestions, has no connection to the suggestion service, or gets no matches can still type the full address and submit the form as usual.

**Why this priority**: The form must never depend on the suggestion service. Letters have to be completable even when the service is unavailable, over quota, or blocked.

**Independent Test**: Block the suggestion service (offline mode or blocked request), type a full address by hand in every address field, and submit; confirm the form submits exactly as before.

**Acceptance Scenarios**:

1. **Given** the suggestion service is unavailable or not configured, **When** the person types an address, **Then** no error blocks them, they see a short plain-language note that suggestions are unavailable, and they can fill every field by hand and submit.
2. **Given** the service returns no suggestions for what was typed, **When** the person keeps typing or moves on, **Then** the typed text is kept unchanged and the form submits normally.
3. **Given** the person types the address by hand and never selects a suggestion, **When** they submit, **Then** the submitted values are exactly what they typed.
4. **Given** the person selected a suggestion and then overwrote some of the filled values, **When** they submit, **Then** the submitted values are their edited values, not the original suggestion.

---

### User Story 3 - Works on phones as well as desktop (Priority: P2)

On a phone, the suggestion list is reachable with a finger, does not get covered by the on-screen keyboard in a way that hides all options, and tapping a suggestion selects it. On desktop, mouse and keyboard (arrow keys, Enter, Escape) both work.

**Why this priority**: Most of the audience uses phones; but the core behavior (Stories 1 and 2) already delivers value on desktop alone.

**Independent Test**: On a phone-sized viewport with touch input, type in the address field, tap a suggestion, and confirm the fields fill. On desktop, do the same using only the keyboard.

**Acceptance Scenarios**:

1. **Given** a touch device, **When** the person taps a suggestion, **Then** it is selected and the fields fill (the tap is not lost because the field lost focus first).
2. **Given** a desktop browser, **When** the person uses the arrow keys and Enter, **Then** they can choose a suggestion without the mouse; Escape closes the list and keeps what they typed.
3. **Given** a screen reader is in use, **When** suggestions appear or fail, **Then** the change is announced in text.

---

### User Story 4 - Accurate wording about what is shared (Priority: P2)

Because suggestions now start on their own, any place that tells the person what is shared and when says so correctly: only the street text they type in the address field is looked up, and nothing is sent before they type.

**Why this priority**: The site's privacy promises must stay true. Copy that says "only if you turn it on" would now be false.

**Independent Test**: Read the notice next to the address field, the note next to the Google Maps verify button, and the privacy page section about address suggestions; confirm none of them mention activating or opting in, and all describe the behavior that actually happens.

**Acceptance Scenarios**:

1. **Given** a form with the address field, **When** the person reads the notice beside it, **Then** it says that what they type in the street field is used to suggest addresses and that they can type by hand instead.
2. **Given** the person has not typed in the street field, **When** they load or focus the form, **Then** no data about them is sent to the suggestion service.

---

### Edge Cases

- The person types fewer characters than the minimum needed for suggestions: no lookup is made and no error is shown.
- The person types quickly: only the most recent text produces suggestions; stale results never overwrite newer typing or a completed selection.
- The person selects a suggestion, then clears the field and types again: suggestions work again for the new text.
- The suggestion lacks a piece (no ZIP, or no city): only the available pieces are filled and the person is told to complete the rest by hand; nothing already typed in an unrelated field is erased.
- A form has only a single address line and no city/state/ZIP fields: only the address field is filled.
- The browser's own saved-address dropdown competes with the suggestions: the person should not see both lists on top of each other.
- The service is rate limited after many searches: the person is told to type by hand and the form keeps working.
- The person's device or browser blocks scripts or network requests to the service: the form still works as a plain form.
- Two address forms are open or reopened on the same page: each behaves independently and none is connected twice.
- The collector's (agency's) address fields are not the person's address: they are not part of this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Address suggestions MUST become available automatically once the person types in their own street/address field; no checkbox, toggle, button or other prior step may be required.
- **FR-002**: The checkbox (or any control) whose only purpose was to enable address autocomplete MUST NOT appear on any form, and no visible text may instruct the person to activate or enable autocomplete.
- **FR-003**: Suggestions MUST appear while the person types, after a short pause and once a minimum amount of text is entered, without the person pressing anything.
- **FR-004**: Selecting a suggestion MUST fill the person's street field with the street and number of the chosen address.
- **FR-005**: Where the same form has separate city, state and ZIP code fields for the person, selecting a suggestion MUST also fill those fields with the matching values; where such a field does not exist, it MUST be skipped without error.
- **FR-006**: Every field filled by a selection MUST remain editable, and the form MUST treat filled values exactly as if typed (validation, required checks and submission behave the same).
- **FR-007**: Manual entry MUST always work: the person can type every address field by hand and submit, whether or not suggestions ever appear.
- **FR-008**: If the suggestion service fails, is unavailable, is not configured, is rate limited, or returns no suggestions, the person MUST see, at most, a short plain-language note and MUST still be able to type and submit normally. Failures MUST NOT block submission or erase typed text.
- **FR-009**: The feature MUST reuse the existing address suggestion integration (the existing browser script and the existing server-side function). It MUST NOT introduce a new address system or another autocomplete provider.
- **FR-010**: No provider credentials may appear in browser-delivered files or in the repository; they MUST stay in the server environment as they do today.
- **FR-011**: Only what the person types in their street field may be sent to obtain suggestions; name, phone, city, state, ZIP and the rest of the form MUST NOT be sent, and nothing may be sent before the person types in that field. Analytics MUST record only that the feature was used, never an address.
- **FR-012**: Form layout and design MUST NOT be redesigned; the only visible changes are the suggestion list, its short status/notice text, and removal of any enabling checkbox and its wording.
- **FR-013**: Existing form submission, letter generation, payments, authentication, reports and all other unrelated functionality MUST behave exactly as before.
- **FR-014**: The behavior MUST work with touch on phones and with mouse and keyboard on desktop, and status changes MUST be available to screen readers as text.
- **FR-015**: All notices and policy text that describe address suggestions (beside the field, beside the Google Maps verify button, and on the privacy page) MUST match the actual behavior and MUST NOT describe the feature as opt-in.
- **FR-016**: The person's own address field MUST get this behavior on both forms that ask for it: the letter forms on the credit page (which already have it) and the person's address ("Tu calle y número") on the collector-contact letter form in the tools page (which currently has none). Because the second form starts sending street text to the suggestion service, the privacy page's description of where this happens MUST be updated to include it.
- **FR-017**: Suggestions MUST NOT be attached to the collector's/agency's address fields, which are not the person's own address.

### Key Entities

- **Person's address**: The person's own street line, city, state and ZIP code as entered on a letter form; may be typed by hand or filled from a chosen suggestion, and is submitted like any other form data.
- **Address suggestion**: A candidate address shown while typing, with a main line (street and number) and a secondary line (city, state); selecting it yields the complete address parts used to fill fields.
- **Suggestion status note**: A short text near the field that tells the person what is happening (suggestions available, none found, unavailable, completed) so they always know they can type by hand.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can go from clicking the address field to having street, city, state and ZIP filled in, using only typing and one selection, with zero additional controls to operate.
- **SC-002**: In 100% of the tested form loads, no enabling checkbox or "activate autocomplete" wording is visible.
- **SC-003**: With the suggestion service fully blocked, 100% of tested forms can still be completed by hand and submitted with the same result as before this change.
- **SC-004**: For a typical typed street address, suggestions appear within 2 seconds of the person pausing, on both a desktop browser and a phone-sized touch device.
- **SC-005**: Selecting a suggestion fills every available address part on the first attempt in at least 95% of tested real addresses; the rest are clearly flagged for the person to finish by hand.
- **SC-006**: Zero requests leave the browser before the person types in the street field, and no request ever contains data from other fields (verified by inspecting traffic).
- **SC-007**: The full existing automated test suite still passes after the change, with no test weakened.
- **SC-008**: Every piece of user-facing text about address suggestions agrees with the real behavior (reviewed against the four places it appears).

## Assumptions

- "The existing person's address field" means the person's own street/address line on letter forms; the collector/agency address is out of scope.
- The existing integration (browser script plus server-side function that calls Google) is the single mechanism to reuse; its minimum-characters and pause values, session handling and rate limiting stay as they are unless testing shows they prevent the success criteria.
- Where the browser script is already active without a checkbox (credit-page letter forms), this feature is primarily verification plus the text corrections in FR-015; new wiring is needed only for the tools-page form, which has the person's address but no autocomplete (FR-016, confirmed in scope by the project owner).
- Users have an ordinary internet connection; when they don't, manual entry is the expected path (Story 2).
- The provider's credential is configured in the server environment; when it is missing, the form degrades to manual entry (FR-008) rather than failing.
- Spanish is the primary language of the visible text; any new or changed notice is written in Spanish, consistent with the rest of the site.
- Project rules that apply: personal data stays minimal (constitution II), the site must work without third-party help (constitution III), the address script's tests are run and pass before release, files keep LF line endings, and the knowledge graph is updated after code changes.
