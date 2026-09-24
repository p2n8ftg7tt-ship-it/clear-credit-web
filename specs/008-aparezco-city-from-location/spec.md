# Feature Specification: "¿Aparezco?" fills in my city from my location

**Feature Branch**: `008-aparezco-city-from-location` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "quiero que agregues en aparezco a la hora de escribir se observa la ciudad por defecto, mejor poner mi localizacion, si asi fuera que la persona no tenga que escribir la ciudad y el estado, si fuera diferente la localidad pq estuviera en otra parte del pais entonces se escribe la nueva ciudad"

In plain words: on **¿Aparezco?**, the "Ciudad y estado" field shows a fixed example ("Roanoke, VA") that has nothing to do with the visitor. Instead, the field should come **already filled with the visitor's own city and state**, so most people don't have to type it. If the business is somewhere else in the country, the visitor simply types the other city over it.

## What already exists (checked 2026-09-23)

| Finding | Evidence |
|---------|----------|
| The field "Ciudad y estado" is empty; "Roanoke, VA" is only a grey **example** (placeholder), which reads like a default city. The field is optional. | `aparezco.html` `#apCiudad`. |
| When the city is left empty, the "what it sells" search is sent as "… cerca de mí". That search runs on the server, so "near me" is **near the server, not near the visitor** — the category position and the competitor comparison can come from the wrong place. | `netlify/functions/revisar-negocio.js` `consultarGoogle()` (`consultaGiro`). |
| The site currently **blocks** device location for every page (`geolocation=()`), and its content rules list the services the page may contact. Any use of device location needs an explicit change there. | `netlify.toml` headers (Permissions-Policy, CSP). |
| Signed-in visitors may have a city and state saved in their profile on "Mi cuenta" (optional). | `cuenta.html` `#profileCity`, `#profileState`. |
| Project rules: personal data stays with the visitor unless an action they start needs it; analytics records only categorical values; third-party calls send the minimum; the page must keep working if something fails. | Constitution principles II and III. |

## Clarifications

### Session 2026-09-23

- Q: How is the visitor's location determined? → A: A — approximate location from the visitor's internet connection (no permission prompt, city-level, no per-lookup cost). Device location (GPS) is not used; the site-wide block on it stays.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - My city is already there (Priority: P1)

A business owner in Houston opens ¿Aparezco?. The "Ciudad y estado" field already says **"Houston, TX"**, with a small note underneath: "Detectamos tu ciudad. Si tu negocio está en otra, escríbela aquí." They type only the business name and what it sells, and press "Buscar mi negocio". The search uses Houston, TX.

**Why this priority**: This is the request: remove the need to type city and state for the common case where the business is where the person is.

**Independent Test**: Open the page from a known location; confirm the field is pre-filled with that city and state in "Ciudad, ST" form, the note is shown, and a search without touching the field uses that city.

**Acceptance Scenarios**:

1. **Given** the visitor's city can be determined, **When** the page loads, **Then** the field contains "Ciudad, ST" (e.g. "Houston, TX") as a real, editable value — not grey example text — and a note says it was detected and can be changed.
2. **Given** the field was filled automatically and not edited, **When** the visitor searches, **Then** the search uses that city and state, and the result shows which city was used.
3. **Given** the city is being determined, **When** the visitor starts typing in the field before it arrives, **Then** what they typed is never overwritten.
4. **Given** the visitor's city cannot be determined (outside the US, blocked, error, slow), **When** the page loads, **Then** the field stays empty with the usual example text, no error is shown, and the page works exactly as today.

---

### User Story 2 - My business is in another city: I just type it (Priority: P1)

The owner lives in Houston but the business is in Dallas. They select the pre-filled text (or tap a small "×" to clear it) and type "Dallas, TX". The search uses Dallas.

**Why this priority**: Explicitly requested; without it the automatic city would be a trap for anyone whose business is elsewhere.

**Independent Test**: With a pre-filled city, replace it with another city and search; confirm the typed city is used and the detected one is not sent.

**Acceptance Scenarios**:

1. **Given** a pre-filled city, **When** the visitor clears it (one tap on the clear control, or selecting and typing), **Then** the field accepts the new city with no extra steps.
2. **Given** the visitor typed a different city, **When** they search, **Then** only the typed city is used.
3. **Given** the visitor searches again from the result ("Buscar otro negocio"), **When** the form reappears, **Then** it keeps the last city they used, not the detected one.

---

### User Story 3 - An empty city no longer searches "near the server" (Priority: P2)

If the field ends up empty (the visitor cleared it and did not type another), the search must not silently run "cerca de mí" from the server's location.

**Why this priority**: Today this produces a category position and competitor averages from the wrong place, which matters even more once the Themora Digital Score (feature 007) uses them.

**Independent Test**: Search with the city empty; confirm the page asks for a city (or clearly states the search had no city) and never shows a category position computed "near" an unrelated place.

**Acceptance Scenarios**:

1. **Given** the city field is empty, **When** the visitor presses "Buscar mi negocio", **Then** the page asks for the city and state with a friendly message and focuses the field, instead of searching without a place.

---

### Edge Cases

- **Visitor outside the United States** (or location resolves to no US state): leave the field empty; do not fill a foreign city.
- **Location resolves only to a state, not a city**: leave the field empty (a state alone is too broad for a local search).
- **Visitor on a VPN or corporate network** whose detected city is wrong: the note makes it clear it can be changed; nothing is assumed silently.
- **Signed-in visitor with a saved city** that differs from the detected one: use the saved city (it is what they told us), still editable.
- **Browser back / reload**: a city the visitor typed is not replaced by the detected one on return.
- **Slow detection**: if the city has not arrived within about 2 seconds, stop waiting and leave the field as is; never block the form.
- **Detected city is also the example city (Roanoke, VA)**: it is shown as a real value with the note, never as grey example text.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On load, ¿Aparezco? MUST try to determine the visitor's US city and state and, when found, put it in the "Ciudad y estado" field as an editable value in the form "Ciudad, ST", with a visible note that it was detected and can be changed.
- **FR-002**: The location MUST be determined approximately from the visitor's internet connection, with no permission prompt and no paid lookup. Device location MUST NOT be requested.
- **FR-003**: For signed-in visitors with a saved city and state in their profile, the saved value MUST be used instead of the detected one.
- **FR-004**: The detected value MUST NOT overwrite anything the visitor has typed, and MUST NOT be applied again after the visitor edits or clears the field during the visit.
- **FR-005**: The field MUST offer a one-tap way to clear it, usable on phones.
- **FR-006**: The search MUST use exactly what is in the field at the moment of searching; the result MUST show the city that was used.
- **FR-007**: If the city field is empty when searching, the page MUST ask for the city and state (friendly Spanish message, field focused) instead of searching "near" an unspecified place.
- **FR-008**: If the location cannot be determined for any reason (outside the US, only a state, error, blocked, over about 2 seconds), the page MUST behave exactly as today, with no error message.
- **FR-009**: The visitor's location MUST NOT be stored by Themora (no database, no logs with the location, no analytics). Analytics MAY record only whether the city was detected, edited, or typed (categorical).
- **FR-010**: The page MUST NOT send the detected location anywhere other than what is needed to turn it into a city and state; the search itself sends only the city and state in the field, as today.
- **FR-011**: The privacy note on ¿Aparezco? MUST say, in plain Spanish, that the city is suggested from the visitor's location, is not saved, and can be changed.

### Key Entities

- **Suggested city**: city + two-letter state, its origin (profile or detected), and whether the visitor has edited the field.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For visitors in the United States whose city can be determined, the field is pre-filled before they reach it in at least 90 % of page loads, within 2 seconds.
- **SC-002**: At least 70 % of searches are made without the visitor typing in the city field (measured with the categorical "detected / edited / typed" event), after one month.
- **SC-003**: 0 searches are sent with an empty city.
- **SC-004**: 0 cases where text the visitor typed is replaced by a detected city (verified by test across fast and slow detection).
- **SC-005**: 0 stored records or analytics events contain a visitor's location, city or state.
- **SC-006**: When location cannot be determined, the page behaves identically to today (same form, no new messages).

## Assumptions

- The audience is in the United States; only US cities with a state are pre-filled.
- A city-level value is enough; a street address or exact coordinates are not needed for this search and are never shown.
- The example text ("Roanoke, VA") remains only as the placeholder when nothing was detected.
- Only ¿Aparezco? is in scope; other forms with a city field are unchanged.
- Existing search limits, the "not configured" path, and AI-optional suggestions are unchanged.
- The site-wide block on device location stays in place (FR-002 does not need it).
