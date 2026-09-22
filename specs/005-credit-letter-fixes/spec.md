# Feature Specification: Credit Page Fixes — Phone Hyphens, No Repeated Address, Many Reported Identities

**Feature Branch**: `005-credit-letter-fixes` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "I manually tested the website and found these issues: 1. On the credit page, I want to separate the phone number with hyphen. 2. When the letter dispute is produced for check before to send, on my correct information the address is redundant (repetitive), because it separate in current address and later write again street, city, etc. 3. If any consumer got many names, address, and phones reported as well. Create acceptance criteria for every bug."

Three bugs found in manual testing of the credit report analyzer (`credito.html`) and its letter drafts (`cartas-bilingues.js`). Each has its own user story and its own acceptance criteria (AC-1.x, AC-2.x, AC-3.x) so it can be built, tested and shipped independently.

## Diagnosis (checked 2026-09-21 against the code)

| # | Bug | What the code does today | Where |
|---|-----|--------------------------|-------|
| B1 | Phone has no hyphens | The phone field is free text (`type="tel"`, 30 chars). Whatever is typed is copied to the letter as-is (`555.014.2000`, `5550142000`, `(540) 555-0142` all come out different). The phones detected in the report are shown as `(540) 555-0000` — parentheses and a space, not hyphens. | `credito.html` `personalFieldsHtml` (phone field), `identityDisplayValue`; `cartas-bilingues.js` `remitente()` |
| B2 | Address repeated in the identity-correction letter | The block **MI INFORMACIÓN CORRECTA / MY CORRECT INFORMATION** prints `Dirección actual: 742 Evergreen Terrace, Roanoke, VA 24016` and then, on four more lines, `Calle y número`, `Ciudad`, `Estado`, `Código postal` — the same address twice. The same address is also already printed in the sender block at the top of the letter. | `cartas-bilingues.js` `cartaIdentidad()` block `correcta` |
| B3 | Reports with many names, addresses and phones are only partly handled | (a) Each problem card lists **only its own type**: the "names" card shows only names, so a report with 3 names, 1 address and 2 phones never lets the person dispute the phones or the address from the names card; only the "mixed identity" card shows everything, and only if there are ≥ 2 of **all three** types. (b) A card is created only when a type has ≥ 2 values, so a report with 2 names and 1 wrong address shows no way to dispute that address. (c) The list is a flat, ungrouped column of checkboxes with no count. (d) The letter lists disputed items in the order they were ticked, not grouped by type. (e) The person can enter only one correct name, one address and one phone. | `credito.html` `detectedOptionsHtml`, the `identity-*` `addNegative` calls (lines ~1382–1385), `submitIdentityCorrection`; `cartas-bilingues.js` block `disputados` |

B3's wording in the request is short ("if any consumer got many names, address, and phones reported as well"). The reading used here is: *when the report lists several names, several addresses and several phones for the same person, the analyzer must show all of them, let the person pick which ones are wrong, and put exactly those in the letter.* Assumption A3 below records what is **not** included and needs the owner's confirmation.

## Assumptions

- **A1**: "Separate the phone with hyphen" means the US format `540-555-0142` (3-3-4), shown while typing, in the detected-phones list, and in every letter. Parentheses and spaces are not used anywhere.
- **A2**: A US phone has 10 digits. A leading country code `1` on an 11-digit entry is dropped. Numbers that are not 10 digits after that are not silently reformatted or truncated; the person is asked to correct them.
- **A3 (needs owner confirmation)**: The person still enters **one** correct name, **one** current address and **one** current phone. Entering several *correct* addresses/phones (for example "previous addresses I confirm are mine") is not part of this feature. Unticked detected items are simply not disputed and are not listed in the letter.
- **A4**: Only the credit analyzer page and its three letters are in scope. Other phone fields (`agendar.html`, `formar-negocio.html`, `herramientas.html`, `listar-negocio.html`) are a follow-up; the formatter is built as one shared function so they can reuse it.
- **A5**: In the bureau-dispute and debt-validation letters, the block **MI INFORMACIÓN / MY INFORMATION** repeats the name, address and phone that the sender block already shows. That is a smaller repetition than B2 and was not reported; it is left as is (see Out of Scope).
- **A6**: The four name parts in the identity letter (given name(s), first surname, second surname) stay, because they say which surname is which — information the joined legal name does not carry.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The phone number is shown and written with hyphens (Priority: P1)

A person filling in a letter form on the credit page types their phone number and sees it turn into `540-555-0142` as they type. The phone numbers found in their report appear the same way, and every letter prints the phone the same way.

**Why this priority**: It is visible on every letter form and in every letter, it is quick to do, and a phone written three different ways looks careless in a letter that goes to a credit bureau.

**Independent Test**: On the credit page, open any letter form, type `5405550142`, `(540) 555-0142` and `540.555.0142` in turn; each becomes `540-555-0142`. Generate a letter and confirm the phone line reads `540-555-0142` in both columns.

**Acceptance Criteria** (AC-1.x):

- **AC-1.1** — **Given** an empty phone field, **When** the person types the digits `5405550142` one by one, **Then** the field shows `5`, `54`, `540`, `540-5`, `540-55`, `540-555`, `540-555-0`, … `540-555-0142` after each key, and the caret does not jump to the end while they edit in the middle.
- **AC-1.2** — **Given** the person pastes `(540) 555-0142`, `540.555.0142`, `540 555 0142` or `+1 540 555 0142`, **When** the paste is applied, **Then** the field shows `540-555-0142` in every case.
- **AC-1.3** — **Given** the person types letters or symbols in the phone field, **When** they do, **Then** those characters do not appear (only digits and the hyphens the formatter adds).
- **AC-1.4** — **Given** more than 10 digits (after dropping a leading `1` on 11 digits), **When** the person keeps typing, **Then** the extra digits are not accepted and the field keeps a 10-digit number.
- **AC-1.5** — **Given** fewer than 10 digits, **When** the person presses "Preparar …", **Then** no letter is produced, the form shows a short message in Spanish asking for a 10-digit phone (for example «Escribe un teléfono de 10 dígitos, como 540-555-0142.»), and the phone field is the one that receives focus.
- **AC-1.6** — **Given** a report where the analyzer detected phones, **When** the "Datos personales detectados" list is shown, **Then** each phone appears as `Teléfono: 540-555-0000` (hyphens, no parentheses) and the value stored in the checkbox is the same string.
- **AC-1.7** — **Given** any of the three letters (identity, bureau dispute, debt validation), **When** it is generated, **Then** every phone in it — the sender block, the "Teléfono actual / Current phone" line, and any disputed phone — is `XXX-XXX-XXXX` in both the Spanish and the English columns and in the copied English text.
- **AC-1.8** — **Given** the form is autofilled by the browser (`autocomplete="tel"`) with `+1 (540) 555-0142` or `5405550142`, **When** the field changes, **Then** it is reformatted to `540-555-0142` without the person touching it.
- **AC-1.9** — **Given** a phone is passed to the letter builder in any shape (`5405550142`, `(540) 555-0142`), **When** the letter is built, **Then** it comes out as `540-555-0142`, so the letter is correct even if the page's typing helper did not run.
- **AC-1.10** — **Given** a screen reader, **When** the field is focused, **Then** its label still reads «Número de teléfono actual» and the hint shows the expected shape (`540-555-0142`).

---

### User Story 2 - "My correct information" no longer repeats the address (Priority: P1)

A person who prepares an identity-correction letter reads the draft before sending it. In the block "MI INFORMACIÓN CORRECTA" (and its English column "MY CORRECT INFORMATION") their address appears **once**, on one line, not once complete and again split into street, city, state and ZIP.

**Why this priority**: The letter is going to a credit bureau; a repeated block makes it look padded and confuses the reader. It is the reported bug and a small, contained change in one block.

**Independent Test**: On the credit page, fill an identity-correction form with street `742 Evergreen Terrace`, city `Roanoke`, state `VA`, ZIP `24016`, tick one detected value, and prepare the letter. In both columns, the correct-information block has exactly one line that contains `742 Evergreen Terrace` and none of `Calle y número`, `Ciudad`, `Estado`, `Código postal` (Spanish) or `Street and number`, `City`, `State`, `ZIP code` (English).

**Acceptance Criteria** (AC-2.x):

- **AC-2.1** — **Given** an identity-correction letter, **When** it is generated, **Then** in the block `correcta` the address appears on **exactly one line**: `Dirección actual: 742 Evergreen Terrace, Roanoke, VA 24016` (Spanish) and `Current address: 742 Evergreen Terrace, Roanoke, VA 24016` (English).
- **AC-2.2** — **Given** the same letter, **When** the block `correcta` is read, **Then** it contains none of the lines `Calle y número:`, `Ciudad:`, `Estado:`, `Código postal:` in Spanish, and none of `Street and number:`, `City:`, `State:`, `ZIP code:` in English.
- **AC-2.3** — **Given** the same letter, **When** the block `correcta` is read, **Then** it still contains, once each: the legal name, the given name(s), first surname, second surname (or «No aplica» / «N/A»), the current address, and the current phone, in that order, in both languages (see A6).
- **AC-2.4** — **Given** the whole letter (all blocks), **When** the street text `742 Evergreen Terrace` is counted, **Then** it appears **at most twice** in each language: once in the sender block at the top and once in the correct-information block — never more.
- **AC-2.5** — **Given** the street, city, state and ZIP are typed with extra spaces, **When** the address is written, **Then** it reads `street, city, state ZIP` with single spaces and no doubled commas.
- **AC-2.6** — **Given** any of the four identity subtypes (`identity-names`, `identity-phones`, `identity-addresses`, `identity-mixed`), **When** the letter is generated, **Then** AC-2.1 to AC-2.5 hold for each.
- **AC-2.7** — **Given** the Spanish and English columns, **When** they are compared, **Then** they have the same number of lines in the block `correcta` and the same facts in the same order (Constitution IV), and the English column has no Spanish words.
- **AC-2.8** — **Given** the "Copiar carta en inglés" button, **When** it is pressed after AC-2.1, **Then** the copied text has the same single address line and no split-address lines.
- **AC-2.9** — **Given** the bureau-dispute and debt-validation letters, **When** they are generated, **Then** they are unchanged by this fix except for the phone format from User Story 1.

---

### User Story 3 - A report with many names, addresses and phones can be fully reviewed and disputed (Priority: P2)

A person whose report lists several names, several addresses and several phones opens the identity problem card and sees **all** of them, grouped by type with a count, ticks only the ones that are wrong, and gets a letter that lists exactly those, grouped the same way, in both languages.

**Why this priority**: It is the case the identity feature exists for (mixed files, aliases, old addresses), and today parts of it are unreachable. It is P2 because it changes more (which cards appear, how the list is built and grouped) and depends on the phone format from User Story 1.

**Independent Test**: Analyze a report whose personal-information block lists three names, two addresses and three phones. Open the identity card: 3 + 2 + 3 = 8 options appear in three labeled groups. Tick two phones and one address; the letter lists those three under "INFORMACIÓN QUE DISPUTO / INFORMATION I AM DISPUTING", phones first or in the fixed group order, hyphenated, and nothing else.

**Acceptance Criteria** (AC-3.x):

- **AC-3.1** — **Given** a report whose personal block lists N names, M addresses and P phones, **When** an identity card is shown, **Then** the "Datos personales detectados" list contains all N + M + P values (none dropped or truncated), including N, M or P of 0, 1, 5 and 10.
- **AC-3.2** — **Given** the list, **When** it is shown, **Then** the values are grouped under three headings — «Nombres (N)», «Direcciones (M)», «Teléfonos (P)» — in that fixed order, and a group with 0 values is not shown.
- **AC-3.3** — **Given** a report with 2 or more values of **any one** type (for example 2 phones but 1 name and 1 address), **When** the analysis runs, **Then** an identity card is offered and its list contains **every detected personal value of all three types**, not only the type that triggered the card.
- **AC-3.4** — **Given** a report with exactly 1 value of each type and nothing repeated, **When** the analysis runs, **Then** no identity card is offered (behavior unchanged) and the positive «Información personal consistente» remains.
- **AC-3.5** — **Given** the same name written twice with different case or spacing (`MARIA GARCIA`, `Maria  Garcia`), the same phone written in different formats, or the same address with different spacing, **When** the values are detected, **Then** each appears **once**.
- **AC-3.6** — **Given** the list, **When** it is first shown, **Then** no box is ticked (the person decides), and each box can be ticked independently.
- **AC-3.7** — **Given** a group with 2 or more values, **When** the person uses the group's «Marcar todos» / «Quitar todos» control, **Then** all boxes in that group toggle and no other group changes.
- **AC-3.8** — **Given** the person ticks K values (1 ≤ K ≤ N + M + P), **When** the letter is generated, **Then** the block `disputados` has exactly K lines, one per ticked value, in both languages.
- **AC-3.9** — **Given** ticked values of mixed types, **When** the letter is generated, **Then** the K lines are grouped in the fixed order names → addresses → phones (not in the order they were ticked), and inside a group in the order they appear in the report.
- **AC-3.10** — **Given** an unticked value, **When** the letter is generated, **Then** that value appears nowhere in the letter, and the person's own correct name, address and phone are never added to the disputed list.
- **AC-3.11** — **Given** no value ticked, **When** the person presses «Preparar solicitud de corrección», **Then** no letter is produced and the existing message asks them to tick at least one name, phone or address.
- **AC-3.12** — **Given** a report with many values, **When** the list is read with a screen reader, **Then** each group is a `fieldset` with a `legend` that includes its count, and each option has a label with its type and value.
- **AC-3.13** — **Given** the 360 px and 1280 px widths, **When** the list has 20+ values, **Then** the page has no horizontal scroll and the list can be scrolled or is fully visible without hiding the "Preparar" button.
- **AC-3.14** — **Given** analytics, **When** the letter is generated, **Then** only the existing event name and category are sent — never a name, address, phone or the number of values (Constitution II).
- **AC-3.15** — **Given** the extraction of names, **When** the personal block lists the bank's or a creditor's name or phone, **Then** those are still excluded as they are today (the existing exclusion tests keep passing).

## Edge Cases

- Phone typed as `1-540-555-0142`, `+1 540 555 0142`, `540 555 0142 ext 5`: the last one has more than 10 digits after dropping the `1`; extra digits are not accepted (AC-1.4). Extensions are not supported.
- Phone field left empty: still required, as today.
- Street with an apartment (`12 Oak St Apt 3`) or a `#`: written exactly as typed on the single address line.
- A second surname with a hyphen or accents: unchanged.
- A report with 30 detected names (a badly extracted PDF): all appear grouped; the "Marcar todos" control makes it usable; no crash and no truncation.
- Detected values that contain `<`, `"` or `&`: shown as text, never as HTML (already the case; must stay).
- A ticked phone that is the same digits as the person's own current phone: allowed; the person decides; the letter lists it under disputed values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST format US phone numbers as `XXX-XXX-XXXX` in the phone field of every credit-page letter form while the person types, pastes or autofills (AC-1.1–1.4, 1.8).
- **FR-002**: The system MUST require 10 digits for that phone at submit and MUST say so in Spanish when it is not (AC-1.5).
- **FR-003**: The system MUST show detected phones and print every phone in every letter in the `XXX-XXX-XXXX` format in both languages, formatted by **one shared function** (AC-1.6, 1.7, 1.9).
- **FR-004**: The identity-correction letter's `correcta` block MUST show the address on one line and MUST NOT repeat street, city, state or ZIP as separate lines (AC-2.1–2.4).
- **FR-005**: The Spanish and English columns of the identity letter MUST keep the same block ids, the same number of lines in each block and the same facts (AC-2.7).
- **FR-006**: The system MUST list every detected name, address and phone from the report's personal block, de-duplicated, grouped by type with counts (AC-3.1, 3.2, 3.5).
- **FR-007**: An identity card MUST be offered whenever any one of the three types has 2 or more values, and MUST list the values of all three types (AC-3.3, 3.4).
- **FR-008**: The person MUST be able to tick each value on its own and to toggle a whole group (AC-3.6, 3.7).
- **FR-009**: The identity letter MUST list exactly the ticked values, grouped names → addresses → phones, in both languages (AC-3.8–3.11).
- **FR-010**: All new visible text MUST be Spanish on the page and, where it appears in a letter, English in the English column; new labels MUST be added to the tested label maps (Constitution V).
- **FR-011**: Nothing typed or detected MUST be sent anywhere new or added to analytics (Constitution II; AC-3.14).
- **FR-012**: The changes MUST NOT alter the bureau-dispute and debt-validation letters except for the phone format (AC-2.9).

### Key Entities

- **Phone number**: digits only in memory; shown as `XXX-XXX-XXXX`. Has no country code stored.
- **Detected personal value**: `{ type: 'Nombre o alias' | 'Dirección' | 'Teléfono', value }`, unique inside its type, produced by the analyzer from the report's personal block.
- **Identity group**: the values of one type, with a count; the unit of the «Marcar todos» control.
- **Correct-information block (`correcta`)**: the person's own legal name parts, one address line and one phone, as they are printed in the identity letter.

## Success Criteria *(mandatory)*

- **SC-001**: In 100 % of generated letters (3 letter types × the test data set), every phone matches `^\d{3}-\d{3}-\d{4}$` in both languages.
- **SC-002**: In the identity letter, the person's street text appears at most twice per language, and the four split-address labels appear zero times.
- **SC-003**: For a report with N names, M addresses and P phones (N, M, P each in 0…10), the list has exactly N + M + P options and the letter has exactly as many disputed lines as ticked options.
- **SC-004**: `node --test tests/` passes, including new tests for each acceptance criterion that can run without a browser, and the existing letter and detection tests still pass without being weakened.
- **SC-005**: The owner can repeat the three manual checks in [quickstart.md](./quickstart.md) in under 10 minutes and sees the three bugs gone.

## Out of Scope

- Phone fields on other pages (A4) and non-US phone formats.
- Repetition of name/address/phone between the sender block and **MI INFORMACIÓN** in the bureau-dispute and debt-validation letters (A5).
- Entering several *correct* names, addresses or phones (A3).
- Changing how the analyzer reads the PDF or which words count as a name/address (only which detected values are shown and how they are grouped).
- Any AI, translation service, storage or new external service.
- Native-speaker review of the English text (still pending from spec 003; new strings are added to the same list).

## Open Questions

- **Q1 (A3)**: Should the person be able to list several *correct* addresses or phones (for example a previous address they confirm as theirs)? Default used in the plan: **no**. Confirm or change.
- **Q2 (A5)**: Should the same "no repetition" rule also apply to **MI INFORMACIÓN** in the two other letters? Default used in the plan: **no**, only the reported block.
