# Feature Specification: Fix Address Autocomplete Not Working

**Feature Branch**: `002-fix-address-autocomplete` (no git branch created; no `before_specify` hook is registered)

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "chequea porque el autocompletado de las direcciones no se esta realizando, dame posibles causas y como resolverlas"

## Diagnosis (observed on 2026-09-20, before writing this spec)

Everything below was checked directly, not assumed. Items marked **hypothesis** could not be verified from the development machine.

### What is confirmed

| # | Finding | Evidence |
|---|---------|----------|
| D1 | The server-side piece of the feature is **not published**. The public site answers "not found" for the address-suggestion service, while other services published from the same folder (invoicing, business review, coach) exist. | Requests to the published site return 404 for the suggestion service and 405 for the invoicing one (405 = exists, wrong method). |
| D2 | The browser-side piece **is** published and identical to the local copy, and it was published *after* the server-side file was created. So the latest publish carried the page and script but not the service. | Published script and local script have the same checksum; the script was last edited after the service file. |
| D3 | The service code itself is healthy: it passes a syntax check, has no external dependencies, and all 20 automated tests for it pass. | `node --test tests/autocompletar-direccion.test.js`: 20 pass, 0 fail. |
| D4 | The feature is connected **only to the letter forms on the credit page**. The person's own address on the tools page ("Tu calle y número") and the profile address on the account page have no autocomplete wired at all. | Only `credito.html` references the browser script. |
| D5 | On the computer used for testing there is no way to run the service locally: the Netlify command-line tool is not installed and there is no local file holding the Google key. | `netlify` command not found; no `.env` file in the project. |
| D6 | When the service is missing (404), the person only sees a generic "type it by hand" note, so nothing tells the owner *why* nothing appears. | Browser script shows the server's error text or a generic message. |

### Probable causes, most likely first, and how to resolve each

| # | Cause | Status | How to resolve |
|---|-------|--------|----------------|
| C1 | The publish method used (manual drag-and-drop or an incomplete command) uploads pages but **does not package the server-side service**. | Consistent with D1 and D2 | Publish with the Netlify command line (`netlify deploy --prod`) from the project folder and confirm `autocompletar-direccion` appears in the list of published functions. Then check that the public address answers "method not allowed" (405) instead of "not found" (404). If a deploy log exists, read its Functions section for a packaging error. |
| C2 | The person testing is on a page where the feature **was never connected** (tools page, account page, business pages). | Confirmed for those pages (D4) | Test on the credit page first (upload a report, open a letter form, type in "Calle y número"). To get it elsewhere, wire the tools-page form (already scoped in spec 001, FR-016). |
| C3 | **Testing locally** without the service running or without the key. A plain file open or a static server cannot run the service; only the Netlify local server can, and only on port 8888 (or 3000) and only with the key in a local file. | Confirmed setup gap (D5) | Install the Netlify CLI, create a local `.env` with `GOOGLE_PLACES_API_KEY`, run `netlify dev`, open `http://localhost:8888/credito.html`. Make sure `.env` is ignored by git. |
| C4 | The Google key is **missing** in the published site's environment (service answers "not configured" and the page silently gives up). | **Hypothesis** (cannot be seen from outside without the service published) | In Netlify: Site configuration → Environment variables → set `GOOGLE_PLACES_API_KEY` (same key `revisar-negocio` uses), then publish again (variables apply on the next deploy). |
| C5 | The Google key exists but **Places API (New) is not enabled**, billing is off, or the daily quota is exhausted. The service then answers "unavailable" and the page turns suggestions off for that visit. | **Hypothesis** | In Google Cloud Console: enable "Places API (New)", confirm billing is active, check Quotas. |
| C6 | The Google key has **application restrictions for websites (HTTP referrer)**. Calls come from Netlify's servers, not from a browser, so a referrer-restricted key is rejected. | **Hypothesis** | Use no application restriction (or an IP restriction that fits), and restrict by API instead (only Places API (New)). |
| C7 | The person types **fewer than 4 characters**, or the request is **rejected as coming from another site** (a preview or alternative address not on the allowed list), or more than 60 searches in 10 minutes from one place. | Behavior by design | Type at least 4 characters; test on `mithemora.com`; wait a few minutes if rate limited. Add the preview address to the allowed list if previews must work. |
| C8 | The street text looks like a social security or card number, so the service refuses it. | By design | Type a normal street address. |

Ruled out: the site's browser security policy (it only needs to allow calls to the site itself, which it does); the wiring on the credit page (correctly connected and passing tests); the Google integration code (tests pass).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Suggestions actually appear on the live site (Priority: P1)

A person on the published site opens a letter form on the credit page, types a street address in "Calle y número", and sees suggestions. Choosing one fills street, city, state and ZIP.

**Why this priority**: The feature was built and tested but does not reach real users. Nothing else matters until this works in production.

**Independent Test**: On the published site, in a clean browser session, open a letter form, type "1600 Pennsylvania" and confirm suggestions appear within 2 seconds and choosing one fills the four fields.

**Acceptance Scenarios**:

1. **Given** the site has been published with the address service included, **When** a person types 4 or more characters of a real US street address in the street field, **Then** address suggestions appear.
2. **Given** suggestions are showing, **When** the person picks one, **Then** street, city, state and ZIP are filled and remain editable.
3. **Given** the service is published, **When** the owner checks its public address without sending a search, **Then** it responds as "exists but wrong method" and not as "not found".

---

### User Story 2 - The owner can tell in one step whether it is working and why not (Priority: P1)

After every publish, the owner can find out in under a minute whether the address feature is live, and if it is not, which of the known causes applies (service missing, key missing, provider refused the key, quota).

**Why this priority**: Today the failure is invisible: the person sees a generic note and the owner sees nothing. The same silent failure can recur after any publish.

**Independent Test**: With the service deliberately unpublished, then with the key removed, then with the provider refusing, confirm the owner-facing check reports a different, understandable result each time.

**Acceptance Scenarios**:

1. **Given** the service is not published, **When** the owner runs the check, **Then** it reports "service not published" and the first step to fix it.
2. **Given** the service is published but has no key, **When** the owner runs the check, **Then** it reports "key missing".
3. **Given** the service is published with a key the provider refuses, **When** the owner runs the check, **Then** it reports "provider refused" without revealing the key or any typed address.
4. **Given** everything is configured, **When** the owner runs the check, **Then** it reports "working".

---

### User Story 3 - The person is told honestly when suggestions are unavailable (Priority: P2)

When the service is missing or failing, the person sees one short, honest note ("suggestions are not available right now, type your address by hand") and the form keeps working. The note is the same whether the service is missing, unconfigured, or refused.

**Why this priority**: Manual entry already works; this only makes the degraded state consistent (a missing service currently shows a different, vaguer note than a failing one).

**Independent Test**: Block the service, type in the street field, and confirm the note and that the form submits normally.

**Acceptance Scenarios**:

1. **Given** the service is missing (not found), **When** the person types in the street field, **Then** suggestions turn off for that visit, the note says so, and no further requests are made per keystroke.
2. **Given** suggestions are unavailable, **When** the person completes and submits the form by hand, **Then** it submits exactly as before.

---

### User Story 4 - Testing the feature on a developer machine is documented and possible (Priority: P2)

A person maintaining the site can run the feature locally by following written steps, and knows which pages have it and which do not.

**Why this priority**: Local testing failed for a reason that is easy to fix and easy to repeat (no local server, no key, wrong port).

**Independent Test**: Follow the written steps on a machine that has never run the project and get suggestions on the credit page.

**Acceptance Scenarios**:

1. **Given** a machine with the project folder, **When** the maintainer follows the written local steps, **Then** suggestions appear on the credit page at the local address.
2. **Given** the instructions file, **When** the maintainer reads it, **Then** it states which pages have the feature, the required key and API, the allowed local addresses, and that the local key file must not be committed.

---

### Edge Cases

- The publish carries the page but not the service (this incident): the check in Story 2 must catch it.
- A new publish removes the service again because the method used never packages services.
- The key is valid but the daily quota is used up mid-day: suggestions turn off for that visit and recover when quota returns.
- The person tests on a preview address that is not on the allowed list: they see a clear "not allowed here" outcome, not silence.
- The person types a very short or numeric-looking string: no request or a clear refusal, no error dialog.
- Suggestions work on the credit page but the person is looking for them on the tools or account page: the pages that do not have the feature must not claim to.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After a publish, the address-suggestion service MUST be reachable on the public site (responds as existing, not as "not found").
- **FR-002**: The published site MUST provide suggestions for a real street address typed in the person's street field on the credit-page letter forms, and selecting one MUST fill street, city, state and ZIP.
- **FR-003**: The owner MUST be able to check, without typing any real address and without exposing the key, whether the feature is working, and get a distinct result for: service not published, key missing, provider refused, quota exceeded, working.
- **FR-004**: The project documentation MUST list, in plain Spanish, the causes in the "Probable causes" table with the step to resolve each, and MUST include the exact confirmation to run after each publish.
- **FR-005**: When the service is missing, unconfigured or refused, the person MUST see one consistent short note and suggestions MUST stop for that visit; the form MUST remain fully usable by hand.
- **FR-006**: The documentation MUST state which pages have address suggestions and which do not, and no page may tell the person that suggestions are available where they are not.
- **FR-007**: The documentation MUST describe how to run the feature locally (service runner, local key file, allowed local addresses) and MUST state that the local key file is never committed or published.
- **FR-008**: The provider key MUST stay in the server environment; it MUST NOT appear in any browser-delivered file, log, check output or repository file.
- **FR-009**: The check and the fix MUST NOT log or return what a person typed, and MUST NOT send data other than the street text.
- **FR-010**: Manual entry and the existing form submission, letter generation, payments and authentication MUST behave exactly as before.
- **FR-011**: The existing automated tests MUST still pass, none weakened, and any new behavior MUST come with tests.

### Key Entities

- **Address service (published)**: The server-side piece that answers suggestion and detail requests; its presence on the public site is what this feature is missing.
- **Provider key**: The credential in the server environment that authorizes the provider calls; may be missing, restricted wrongly, or over quota.
- **Health result**: The owner-facing outcome (not published / key missing / provider refused / quota / working) with the next step.
- **Suggestion status note**: The short text near the street field telling the person what is happening.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the published site, in 100% of tested loads of a credit-page letter form, typing a real street address (4+ characters) shows suggestions within 2 seconds.
- **SC-002**: After any publish, the owner can tell whether the feature is live in under 1 minute using one step.
- **SC-003**: Each of the five health outcomes is reproducible on demand and reports the right cause.
- **SC-004**: With the service blocked, 100% of tested forms still submit by hand with the same result as before.
- **SC-005**: A maintainer who has never run the project gets suggestions locally in under 15 minutes by following the written steps only.
- **SC-006**: No provider key or typed address appears in any log, check output or delivered file (verified by inspection).
- **SC-007**: The full existing automated test suite passes with no test weakened.

## Assumptions

- The project is published manually (no git remote and no `.netlify` link folder were found), so the leading explanation is that the publish method does not package the service (C1). If the owner publishes another way, C1 must be re-checked against that method's log.
- The same Google key already used by the business-review feature is the one to use; the owner has access to the Netlify and Google Cloud consoles.
- Causes C4, C5 and C6 cannot be verified until the service is published; the owner-facing check (Story 2) exists precisely to tell them apart.
- Extending suggestions to the tools page and account page is tracked by spec 001 (FR-016) and is out of scope here except for not misleading people about where the feature exists.
- Spanish is the primary language of visible text and documentation; project rules apply: privacy by design (constitution II), works without third parties (III), tests pass before publishing (IV), keys only in the server environment, LF line endings, knowledge graph updated after code changes.
