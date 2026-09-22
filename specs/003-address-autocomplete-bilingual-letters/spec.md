# Feature Specification: Address Autocomplete Everywhere + Side-by-Side Bilingual Letters

**Feature Branch**: `003-address-autocomplete-bilingual-letters` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Quiero saber porque el autocompletado de las direccion por google no funciona en todos los formularios que lleva direciion en mi proyecto ademas. ademas en la pagina de analizador de mi reporte de credito al final en el borrador quiero que la carta se produzca en paralelo en dos columnas una en espanol para que la entienda el cleinte y otra en ingles que es la que se va a enviar."

This request has two parts:

- **Part A** — explain *why* address suggestions do not work in every form that asks for an address, and close the gaps (User Stories 1 and 2).
- **Part B** — on the credit report analyzer page, show each letter draft in two parallel columns: Spanish (so the person understands it) and English (the one that is actually sent) (User Stories 3, 4 and 5).

## Diagnosis — why address suggestions do not work in every form (checked 2026-09-20)

This builds on the diagnosis already recorded in `specs/002-fix-address-autocomplete/spec.md` (causes C1–C8). Everything below was checked directly against the project files and the public site.

### Forms in the project that ask for an address

| # | Page | Field(s) | Whose address | Has suggestions today? | Why / why not |
|---|------|----------|---------------|------------------------|---------------|
| F1 | Credit analyzer — the three letter forms (identity correction, bureau dispute, debt validation) | "Calle y número", city, state, ZIP | The person's own | **Wired** (in the code) | Connected the first time the person focuses inside a letter form. |
| F2 | Credit analyzer — debt-validation letter | Collector's street, city, state, ZIP | The collection agency's | **Not wired** | Deliberately left out by an earlier decision (spec 001, FR-017). The user now asks for *every* address form, so that decision is superseded (see FR-006). |
| F3 | Tools page — collector-contact ("cese de comunicación") letter | "Tu calle y número", city, state, ZIP | The person's own | **Not wired** | The suggestion script is only loaded on the credit page; this page never loads it. Planned in spec 001 (FR-016) but not built. |
| F4 | Tools page — same letter | "Dirección de la agencia (calle y número)" | The collection agency's | **Not wired** | Same as F3; also excluded by spec 001 FR-017. |
| F5 | Account page — profile | "Dirección", "Ciudad", "Estado y código postal" | The person's own | **Not wired** | The script is not loaded there, and this form is built differently: state and ZIP share **one** field, and the fields have no form field names the script relies on. |
| F6 | List-your-business page | "Dirección completa del negocio" | The business's | **Not wired** | The script is not loaded there, and the form has **one single** field for the whole address (no separate street/city/state/ZIP). |
| — | Other pages (contact, scheduling, login, business formation, buy house/car, car contract) | none | — | n/a | These forms do not ask for a street address. (The "Ciudad" field on the "aparezco" page is city only.) |

### Findings

| # | Finding | Evidence |
|---|---------|----------|
| D1 | **Nothing works in production right now**, on any form, including F1. The server-side piece that fetches suggestions is still **not published**: the public site answers "not found" (404) both to a plain request and to a search request. The browser-side script *is* published. | Checked on 2026-09-20 against the public site: 404 for both request types; the script file is served. |
| D2 | **Even once D1 is fixed, only F1 would work.** The suggestion script is loaded by exactly one page and wired to exactly one place; every other address form (F2–F6) has no wiring at all. | Only the credit page loads the script and calls it. |
| D3 | **The script only understands one form shape**: separate street, city, state and ZIP fields with specific names. F5 (state+ZIP merged, unnamed fields) and F6 (one single address field) do not match that shape, so simply loading the script there would not work; they need the script to support "fill what exists" behavior. | Field structure of the account and business pages. |
| D4 | **The person cannot tell which forms are supposed to have suggestions**: where it is not wired there is no notice at all, and where the service is missing (D1) the note only says "type it by hand", so nothing explains *why*. | Behavior of the script when the service is missing. |

### Most probable causes, in order

1. **Service not published (D1)** — fixes nothing until it is; see spec 002 (C1) for how to publish and verify (published function list; the public address must answer "method not allowed", not "not found").
2. **Only one form was ever wired (D2)** — this spec closes it for F2–F6.
3. **Form shapes not supported (D3)** — this spec requires the suggestion behavior to adapt to single-field and merged state/ZIP forms.
4. Google-side causes (key missing, Places API not enabled, referrer-restricted key, quota) remain **hypotheses** that cannot be checked until the service is published — spec 002 (C4–C6).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Suggestions appear in every form that asks for an address (Priority: P1)

A person filling in any form that asks for an address — on the credit analyzer letters, the tools page letter, their account profile, or the business listing — starts typing a street address in that field and sees address suggestions, exactly as they do in the credit analyzer letters today. Choosing one fills whatever address fields that particular form has.

**Why this priority**: This is the first half of the request. Today it works in one place at most (and in production it works nowhere — D1), which makes the site feel broken and inconsistent.

**Independent Test**: With the suggestion service published, on each of the forms F1–F6 (in a clean browser session): type at least the minimum number of characters of a real US address into its street/address field, confirm suggestions appear, choose one, and confirm the fields that exist on that form are filled.

**Acceptance Scenarios**:

1. **Given** a form with separate street, city, state and ZIP fields (F1, F2, F3, F4), **When** the person types a street address and picks a suggestion, **Then** street, city, state and ZIP are all filled and remain editable.
2. **Given** the account profile form (F5) where state and ZIP share one field, **When** the person picks a suggestion, **Then** the address field gets the street and number, the city field gets the city, and the shared state/ZIP field gets both (for example "VA 24016"), all editable.
3. **Given** the business form (F6) with one single address field, **When** the person picks a suggestion, **Then** that field receives the complete formatted address and nothing else on the page changes.
4. **Given** a page that has two address blocks (the person's and the collector's, in F2 and F4), **When** the person picks a suggestion in one block, **Then** only that block's fields are filled; the other block is not touched.
5. **Given** any of these forms, **When** the person has not typed in the address field, **Then** nothing is sent anywhere (no request on page load, focus, or typing in other fields).

---

### User Story 2 - Whenever suggestions can't appear, the owner and the person can tell (Priority: P1)

If the suggestion service is missing, not configured or out of quota, the person on any form sees a short plain-language note and keeps typing by hand. The owner has one simple way to check whether the service is live, and the check tells them whether the problem is "not published" or "published but not configured".

**Why this priority**: The feature currently fails silently in production for weeks (D1, D4). Without a visible signal the same problem will come back unnoticed.

**Independent Test**: Simulate the service being missing on any wired form: the note appears, typing and submitting still work. As owner, run the documented check and confirm it distinguishes "not published" from "published but not configured".

**Acceptance Scenarios**:

1. **Given** the service is unavailable, **When** the person types in any address field, **Then** they see a short note that suggestions are unavailable and can complete and submit the form by hand.
2. **Given** the owner checks the service on the published site without sending a real search, **When** the check runs, **Then** the result tells them whether the service exists and whether it is configured, without exposing any secret.
3. **Given** the service failed once during a visit, **When** the person keeps typing, **Then** the page does not keep hammering the failing service.

---

### User Story 3 - I see my letter in Spanish and English side by side (Priority: P1)

On the credit analyzer page, after the person fills in a letter form (identity correction, bureau dispute, or debt validation) and asks for the draft, the draft appears in **two parallel columns**: the left column is the letter in **Spanish**, so the person understands exactly what it says; the right column is the same letter in **English**, which is the one that will be sent to the credit bureau or collection agency. Each column is clearly labeled ("Para que la entiendas — español" / "Para enviar — English").

**Why this priority**: This is the second half of the request. Today the draft is Spanish only, but the recipients are US bureaus and collectors that read English, so the person has no letter they can actually send, and no way to understand the English one.

**Independent Test**: On the analyzer, open each of the three letter forms, fill them in, ask for the draft, and confirm two labeled columns appear with the same content in both languages.

**Acceptance Scenarios**:

1. **Given** the person has filled in a letter form, **When** they ask for the draft, **Then** two columns appear: Spanish (labeled as the version for understanding) and English (labeled as the version to send).
2. **Given** the draft is showing, **When** the person compares the columns, **Then** they contain the same facts: names, addresses, phone, dates, account or reference numbers, the disputed items, the recipient, and the same legal citations.
3. **Given** the draft is showing on a wide screen, **When** the person reads across, **Then** each Spanish paragraph sits beside its English counterpart so they can be compared block by block.
4. **Given** the draft is showing on a phone, **When** the person scrolls, **Then** the columns stack (never side-by-side squeezed), each still clearly labeled, and neither requires horizontal scrolling.
5. **Given** the person changes the form and asks for the draft again, **When** the new draft appears, **Then** both columns refresh together and never show different versions of the letter.

---

### User Story 4 - I copy only the English letter, never the Spanish one by mistake (Priority: P1)

The main action on the draft is to copy the **English** letter, ready to paste into a document or email. The Spanish text is for reading only; copying it, if offered at all, is a separate, clearly labeled action that says it is not the one to send.

**Why this priority**: Sending the Spanish version to a bureau would defeat the point of the feature and could delay the person's case.

**Independent Test**: Ask for a draft, press the primary copy button, paste elsewhere, and confirm only the English letter was copied (no Spanish text, no column labels).

**Acceptance Scenarios**:

1. **Given** the draft is showing, **When** the person presses the primary copy button, **Then** the clipboard receives the English letter only, with no labels, no Spanish text and no extra notes.
2. **Given** the copy succeeded or failed, **When** the person looks at the button, **Then** it says so in plain language (as the current button does), and on failure lets them select the text manually.
3. **Given** a separate action to copy the Spanish version exists, **When** the person presses it, **Then** it is clearly labeled "solo para leer / not for sending" and never replaces the primary action.

---

### User Story 5 - Text the person wrote themselves is handled honestly (Priority: P2)

Some parts of the letter are typed by the person, not chosen from a list, for example "Detalle adicional" in the dispute letter, or names and street addresses. These cannot be translated reliably without an outside service. The draft keeps what they typed exactly as typed in both columns, and when free text typed in Spanish ends up in the English letter, the person is told plainly to review or rewrite that line in English before sending.

**Why this priority**: Better to be honest than to silently send a half-Spanish "English" letter, or to promise a translation the site cannot guarantee.

**Independent Test**: Fill "Detalle adicional" with Spanish text, ask for the draft, and confirm the English column includes it unchanged, the notice appears, and the notice does not appear when the field is empty.

**Acceptance Scenarios**:

1. **Given** the person typed free text in the additional-detail field, **When** the draft appears, **Then** that text appears unchanged in both columns and a visible note near the English column says that line is in the person's own words and should be reviewed/written in English before sending.
2. **Given** the person left that field empty, **When** the draft appears, **Then** no such note appears.
3. **Given** the site's automatic drafting works with no outside service, **When** the draft is produced, **Then** it does not depend on any AI or translation service being available.

---

### Edge Cases

- The person picks a suggestion, then edits the street (for example adds "Apt 4B"): the letter uses what is in the fields at the time they ask for the draft, in both columns.
- The address contains characters such as accents or "#": both columns show them unchanged.
- A field the letter uses is optional and empty (for example second surname): both columns handle it the same way ("No aplica" / "N/A").
- The analyzer produced a finding title in Spanish (for example the account name shown as the disputed item): the English column must not show that Spanish title as if it were English; it uses the English equivalent of the finding type, and quotes the account name exactly as it appears in the report.
- Dates: the Spanish column shows the date in Spanish format, the English column in US English format; both are the same day.
- The person opens a second letter form on the same page: each form has its own independent draft; drafts do not mix.
- Suggestions service unavailable while the person fills a letter form: the letter still works fully (Part B does not depend on Part A).
- Very small screens (narrow phones) and very long addresses: no text is cut off and no horizontal scroll is required.
- The person prints or saves the page: the English letter can be obtained cleanly without the Spanish column (the primary copy action covers this case; printing is not otherwise in scope).
- Screen reader user: the two columns are announced with their language and purpose (understanding vs. sending).

## Requirements *(mandatory)*

### Functional Requirements — Part A: address suggestions in every address form

- **FR-001**: Every form in the project that asks the person for a street address (F1–F6 in the diagnosis table) MUST offer address suggestions as the person types in its street/address field, with no checkbox or activation step.
- **FR-002**: Choosing a suggestion MUST fill every address field that form actually has (street, city, state, ZIP) and MUST skip any field the form does not have, without error.
- **FR-003**: Where a form combines fields differently (state and ZIP in one field; the whole address in one field), choosing a suggestion MUST fill that combined field in a form natural for it (for example "VA 24016"; or the complete address line).
- **FR-004**: On pages with more than one address block (the person's and the collector's), choosing a suggestion MUST fill only the block where it was chosen.
- **FR-005**: Every filled field MUST stay editable, and the form MUST treat filled values exactly as typed values (validation, required checks, submission).
- **FR-006**: Suggestions MUST also work for the collection agency's address (F2, F4) and for the business address (F6). This deliberately supersedes the earlier exclusion of collector addresses (spec 001, FR-017) because the request is for all address forms; the notice beside each field MUST say that only what is typed in that field is used to get suggestions.
- **FR-007**: Manual entry MUST always work. If the suggestion service fails, is unavailable, not configured, over quota, rate limited, or returns nothing, the person MUST see at most a short plain-language note and MUST still be able to type every field and submit. Typed text MUST NOT be erased.
- **FR-008**: Nothing MUST be sent to obtain suggestions until the person types in an address field; only what is typed in that field MUST be sent, never name, phone, other fields or the rest of the form. Analytics MUST record only that the feature was used, never an address.
- **FR-009**: No provider credential MAY appear in files delivered to the browser or in the repository; it stays in the server environment.
- **FR-010**: The feature MUST reuse the existing suggestion integration (existing browser script and server-side service). It MUST NOT introduce another provider or a second address system.
- **FR-011**: The owner MUST have a simple, documented way to verify after each publish that the service is live and configured, and the result MUST distinguish "not published" from "published but not configured" (User Story 2), without exposing any secret.
- **FR-012**: Notices and policy text that describe address suggestions (beside fields and buttons, and on the privacy page) MUST match the real behavior — including the additional forms and the business/collector addresses that now send street text — and MUST NOT describe the feature as opt-in.
- **FR-013**: Suggestions MUST work with touch on phones and with mouse and keyboard on desktop, and status messages MUST reach screen readers as text.
- **FR-014**: No visual redesign of any form; the only visible additions are the suggestion list and its short status text.

### Functional Requirements — Part B: bilingual side-by-side letter drafts

- **FR-015**: On the credit analyzer page, each of the three letter drafts (identity correction, bureau dispute, debt validation) MUST be shown in two parallel columns: Spanish on one side, English on the other, both generated from the same form data at the same moment.
- **FR-016**: The Spanish column MUST be labeled as the version for the person to understand ("Para que la entiendas — español"); the English column MUST be labeled as the version to send ("Para enviar — English").
- **FR-017**: Both columns MUST contain the same facts: sender name and address and phone, date, recipient (bureau or collector with its address), subject, the disputed items or reason, the requested actions, the legal citations, the account or reference numbers, the enclosures statement, the declaration and the signature block. Neither column may contain a fact the other lacks.
- **FR-018**: On wide screens the columns MUST be aligned block by block (each Spanish paragraph beside its English counterpart); on narrow screens they MUST stack, labeled, without horizontal scrolling.
- **FR-019**: The English letter MUST be complete, formal and ready to send to a US credit bureau or collection agency in the same legal frame the Spanish letter already uses (Fair Credit Reporting Act for bureau letters, Fair Debt Collection Practices Act for collector letters), and MUST NOT state anything the Spanish text does not say.
- **FR-020**: The primary copy action MUST copy the English letter only — no Spanish text, no labels, no notes. Any action to copy the Spanish text MUST be separate, secondary and labeled as not for sending.
- **FR-021**: The drafts MUST remain read-only text (as today), and the current confirmation/failure messages of the copy action MUST be kept.
- **FR-022**: Free text typed by the person (for example "Detalle adicional") MUST be included unchanged in both columns; when such text is present, a visible note beside the English column MUST tell the person that line is in their own words and should be reviewed or written in English before sending; the note MUST NOT appear when there is no free text.
- **FR-023**: Text the site generates itself (dispute reasons, finding types, greetings, legal paragraphs) MUST exist in both languages; text taken verbatim from the person's credit report (account names, values, addresses) MUST be quoted exactly as it appears in the report in both columns.
- **FR-024**: Dates MUST be formatted per language (Spanish and US English) and MUST be the same day in both columns; the letter's US-postal fields (state, ZIP) MUST appear in US format in both.
- **FR-025**: Generating both columns MUST NOT depend on AI or any outside translation service and MUST work offline once the page is loaded, consistent with the site's rule that features work without AI.
- **FR-026**: Nothing the person types into a letter (names, addresses, free text) MUST be sent anywhere or recorded in analytics as a result of this feature; analytics MAY record only that a draft was produced or copied, with no letter content.
- **FR-027**: The existing behavior of the analyzer (upload, analysis, findings, form opening, address verification button, validation and error messages) MUST NOT change except where required to show the two columns and copy the English letter.
- **FR-028**: The English column MUST be readable by screen readers as English and the Spanish column as Spanish, and the columns' purposes MUST be announced.
- **FR-029**: The site's honesty rules MUST hold in both columns: the letters state the person's request and cite the law; they MUST NOT assert that the bureau or collector "is breaking the law", promise an outcome, or give the person legal advice, and the existing educational disclaimer near the letters MUST be kept and MUST mention that the English text is a draft the person is responsible for reviewing.
- **FR-030**: The English column MUST have been reviewed by a person fluent in English (and preferably in US credit correspondence) before being published; until reviewed, the site MUST NOT present it as professionally reviewed (site rule: AI-written translations are marked as pending human review).

### Key Entities

- **Address field group**: the set of fields in one form block that together hold a person's, a collector's or a business's address (street, city, state, ZIP — or a merged/single-field variant). Attributes: which fields exist, whose address it is, whether it is one of several blocks on the same page.
- **Address suggestion**: a candidate address offered while typing; when chosen, it supplies street, city, state and ZIP to the group.
- **Letter draft**: the letter produced from a filled letter form. Attributes: letter type (identity correction, bureau dispute, debt validation), sender, recipient, subject, body blocks, signature block.
- **Letter block**: one paragraph or line group of the letter. Has a Spanish text and an English text with the same meaning; the two columns are built from the same blocks so they cannot drift.
- **Free-text fragment**: text typed by the person that goes into the letter unchanged in both languages and triggers the "review in English" note.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On 100% of the forms that ask for an address (F1–F6), typing at least 4 characters of a real US street address shows suggestions within 2 seconds on a normal connection.
- **SC-002**: On every one of those forms, choosing a suggestion fills all address fields that form has in one action, with no field left for the person to retype except optional unit numbers.
- **SC-003**: With the suggestion service unavailable, 100% of address forms can still be completed and submitted by hand, and the person sees a note explaining suggestions are off.
- **SC-004**: After every publish, the owner can confirm in under 1 minute whether the suggestion service is live and configured.
- **SC-005**: For each of the three letter types, 100% of drafts show two labeled columns whose facts match (names, address, phone, date, recipient, disputed items, legal citations, reference numbers) — verified by an automated comparison for a set of representative form inputs.
- **SC-006**: Pressing the primary copy button copies the English letter only in 100% of tests (no Spanish text, no labels).
- **SC-007**: A person can go from an empty letter form to a copied English letter in under 3 minutes.
- **SC-008**: On a phone-width screen (360 px) and a desktop screen (1280 px), both columns are fully readable with no horizontal scrolling and no cut-off text.
- **SC-009**: In a test with 5 Spanish-speaking readers (or fewer, if that many are not available), at least 4 out of 5 can correctly say what the letter asks for and where it is going by reading only the Spanish column.
- **SC-010**: No letter content or address typed on any of these forms appears in analytics or in any request other than the address-suggestion request described above.

## Assumptions

- **Scope of "todos los formularios"**: every form that asks for a street address, including the person's own, the collection agency's and the business's (F1–F6). This replaces the earlier decision to exclude collector addresses (spec 001, FR-017); the privacy page will state the additional forms.
- **Scope of the bilingual letter**: the three letter drafts on the credit analyzer page. The tools-page "cese de comunicación" letter (Spanish only today) is **not** in scope for the two-column view; it can be added later using the same approach.
- **Existing Spanish letters are the source of truth**: their meaning, legal citations and structure are preserved; the English is the equivalent of the same letter, not a new letter.
- **Free text is not translated**: the site cannot translate text a person types without an outside service, so it shows it unchanged and warns; no AI or paid translation is introduced (site rules: features work without AI; privacy by design).
- **Editing**: the drafts remain read-only, as today; if the person wants to change the letter they change the form and ask for the draft again.
- **Other languages**: Portuguese and Haitian Creole letters are out of scope; the second column is always English because the recipients are US bureaus and collectors.
- **Recipients' addresses** already stored for the three credit bureaus are reused unchanged in both columns.
- **The suggestion service still has to be published** for any of Part A to work (D1); publishing it is part of the resolution and is tracked in spec 002. This spec adds forms and checks, it does not replace that step.
- **Provider key and Google-side configuration** (key present, Places API enabled, billing, referrer restrictions) are outside the code and remain the owner's responsibility (spec 002, C4–C6).
- **Usage limits**: the existing rate limits of the suggestion service apply to all forms combined; no change is requested.
- **Legal review**: the English letters are educational drafts; a native-level review of the English is required before launch (FR-030), and the site's existing disclaimers about not being legal advice remain.
