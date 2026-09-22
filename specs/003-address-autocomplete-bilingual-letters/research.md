# Phase 0 Research: Address Autocomplete Everywhere + Bilingual Letters

Every item is a decision with rationale and rejected alternatives. No `NEEDS CLARIFICATION` remained after reading the code; open questions are listed at the end with the default chosen.

## Part A — Address suggestions

### R1. How to fix "not published" (D1) and prove it

- **Decision**: The owner publishes with the Netlify command line from the project folder (`netlify deploy --prod`) and confirms the function is listed. Verification is one command against the published site that calls a new **`estado` action** of the same function (R6); a 404 means "not published", a 200 with `configurado:false` means "published but no Google key".
- **Rationale**: Spec 002 (C1) already identified a partial publish as the most probable cause; the function file exists locally, passes all its tests, and the script is live. The missing piece is verifiability, not code.
- **Alternatives**: Merging the function into an existing published function (rejected: hides the real problem and adds coupling); a status page in `admin.html` (rejected: more surface for a one-line check).
- **Gate G-BLOCK (new finding)**: `netlify.toml` blocks individual `INSTRUCCIONES-*.md` files, `README.md`, `tests/*`, `_papelera/*`, `Claude outputs/*`, but **not** `specs/`, `.specify/`, `.claude/`, `graphify-out/`, `CLAUDE.md`, `skills-lock.json`, `INSTRUCCIONES-PAGOS.md`, nor the two new instruction files. `publish = "."` means the fixing deploy would publish them. Add 404 rules (same style as existing ones, `force = true`) before publishing.

### R2. Wiring: per-page glue vs declarative attributes

- **Decision**: Forms declare their address fields with `data-dir-*` attributes (see [contracts/address-form-markup.md](./contracts/address-form-markup.md)). `direccion-autocompletar.js` installs **one delegated `focusin` listener on `document`**; on first focus inside an address block it wires that block. Pages only load the script and add attributes. The legacy call `ThemoraDireccion.conectar(form)` keeps working (name-based `street/city/state/postalCode`) so nothing that works today breaks.
- **Rationale**: Root cause D2 is that wiring lived as hand-written glue in exactly one page. Attributes make the wiring part of the markup that creates the field, and it also covers forms rendered later by JS (the analyzer renders letter forms after analysis; account form is hidden until login). Lazy wiring on focus keeps "nothing is sent before typing" (wiring itself sends nothing).
- **Alternatives**: `MutationObserver` scanning (rejected: heavier, no benefit since focus precedes typing); adding a `conectar()` call to each page (rejected: repeats the mistake that caused D2); auto-detecting by `autocomplete="street-address"` (rejected: the collector fields lack it and the account form would be inferred by accident — explicit is safer for privacy: only fields we mark send text).

### R3. Field shapes

Three shapes occur in the six forms:

| Shape | Forms | What is filled on choosing a suggestion |
|---|---|---|
| `separado` — street, city, state, ZIP in four fields | F1, F2, F3, F4 | each field |
| `estado-cp` — street, city, one "state and ZIP" field | F5 | street; city; `"VA 24016"` (2-letter state, space, ZIP; if only one of them is known, only that) |
| `unico` — one field holds the whole address | F6 | `"123 Main St, Roanoke, VA 24016"` (only the parts present, joined with ", "; state and ZIP joined with a space) |

- **Decision**: The composing rules live in one **pure function** (`valoresParaBloque(direccion, forma)`), exported through `__prueba` for Node tests. The service response (`calle`, `ciudad`, `estado`, `cp`) does **not** change.
- **Rationale**: Testable without a browser (Constitution IV); no server change means the tested function contract stays stable.
- **Alternatives**: Server-side formatted string (rejected: forces a contract change and tests for each shape on the server).

### R4. Several address blocks in one form

- **Decision**: State per street field, not per form. The guard `form.dataset.tdaListo` is replaced by a flag on the street input, and each block gets its own list, status line and Google session token.
- **Rationale**: F2/F4 pages have the person's block and the collector's block in one `<form>`; today the guard would wire only the first, and choosing in one block must not fill the other (FR-004).
- **Alternatives**: One form-level session shared by blocks (rejected: mixes sessions of different addresses and breaks per-address billing sessions).

### R5. What happens when the service fails

- **Decision**: 404 / 403 / 405 (not published, wrong origin, wrong method) and `noConfigurado` / `noDisponible` / 5xx → **turn suggestions off for this visit** for that block, show the short note, and stop sending. 429 → close list and show the "too many searches" note (stays on). Network errors → note, stays on. Also `console.warn` a one-line diagnostic for the owner on 404 ("servicio de direcciones no publicado").
- **Rationale**: Today a 404 falls into the generic `!res.ok` branch, keeps the block active and **retries on every keystroke** — contradicts spec US2-3 (do not hammer a failing service). The console line gives the owner a "why" without showing technical text to the person (D4).
- **Alternatives**: Retrying with back-off (rejected: complexity, no benefit on a static 404).

### R6. The owner's one-command check (`estado`)

- **Decision**: Add `accion: "estado"` to the function. It is answered **before** the key check and before session validation, still behind the method and origin checks and the IP rate limit; it never calls Google and never returns the key: `{ vivo: true, configurado: <boolean> }`. Documented curl (with an `Origin` header, since the origin check applies) in `INSTRUCCIONES-DIRECCIONES.md`.
- **Rationale**: GET returns 405 by design, which proves existence but not configuration; a real `sugerir` would spend quota and would need a valid session token. `estado` closes exactly the diagnostic gap without cost.
- **Alternatives**: Public GET health endpoint (rejected: changes the "POST only" contract that tests lock in); log-based diagnosis in Netlify dashboard (kept as a fallback in the docs).

### R7. Notices and "don't advertise until it works"

- **Decision**: The short notice above each address field is inserted at wiring time (on first focus) and describes what happens when typing. No request is made to check the service first, because that would send something before the person types (spec FR-008). Instead the publish order is the control: the fixing deploy carries the function, and the owner runs the check right after; the pages are not published without the function.
- **Alternatives**: Ping `estado` on focus and hide the notice if dead (rejected: violates "nothing before typing" and Constitution II wording).

### R8. Which fields are in scope, and the coverage test

- **Decision**: Wire F1–F6. Add `tests/formularios-direccion.test.js`, which reads every `*.html` in the root and fails when it finds an input/field definition whose `id`/`name` looks like an address (`street|calle|direccion|address`) that is **neither** marked `data-dir-calle` **nor** on an explicit allowlist with a reason (for example the hidden static Netlify form in `listar-negocio.html`, and the `aparezco` city-only field). The test also asserts every page that contains a marked block loads `direccion-autocompletar.js`.
- **Rationale**: The bug class is "a new address field was added and nobody wired it". A test at the file level (no browser) makes it impossible to forget again. `credito.html` builds its forms in JS strings, so the test scans text, not the DOM.
- **Alternatives**: Manual checklist (rejected: that is how D2 happened).

### R9. Collector and business addresses now send text (supersedes spec 001 FR-017)

- **Decision**: Include them. Notice text is per block kind (`persona`, `cobrador`, `negocio`), each stating that only what is typed in that field is used. Privacy page and its third-party table row are updated (gate G-PRIV).
- **Rationale**: The request says "todos los formularios". Collector and business addresses are business addresses, not the person's home address, so the privacy cost is lower than for the person's own.

### R10. Stale text

- **Decision**: Fix the note at `credito.html` (the button note still says autocomplete "solo envía algo si tú lo activas"), the header comments of the browser script and the function (they still mention the checkbox/"casilla"/"activar"), and the privacy paragraph.
- **Rationale**: Spec 001 FR-015 was written but this text is still in the working tree; leaving it contradicts the real behavior.

## Part B — Bilingual letters

### R11. Where the letter content lives

- **Decision**: New `cartas-bilingues.js`, loaded by `credito.html`, exposing `ThemoraCartas.armar(tipo, datos)` and a small set of exported helpers for tests. Each letter is defined once as an ordered list of **blocks**; each block has `es` and `en` (arrays of lines). Facts are injected into both by the same code path. Output: `{ bloques, textoEs, textoEn, hayTextoLibre }`.
- **Rationale**: Today the Spanish letters live as three long inline arrays in `credito.html`. Duplicating them into English inline would create six arrays that drift. One module keeps es/en adjacent (Constitution IV), is unit-testable in Node, and shrinks the inline script.
- **Alternatives**: Keep inline and add English arrays (rejected: drift, untestable in Node); a translation service (rejected: needs AI/third party — Constitution II/III and spec FR-025).

### R12. English wording rules

- **Decision**: English is the equivalent of the existing Spanish, not new legal content. Statutory references are the same ones the Spanish already uses: FCRA § 611 (15 U.S.C. § 1681i) including § 611(d) notification, the 30-day reinvestigation period and the 5-business-day result notice; FDCPA (15 U.S.C. § 1692g) validation request. Formal US business-letter register ("Dear … Dispute Team:", "Sincerely,"). No adjectives that assert a violation ("illegal"), no promises, no advice. Marked `TODO(NATIVE_REVIEW)`.
- **Rationale**: Constitution I and V. Adding or removing a legal claim in English would create a fact only one column has (FR-017).
- **Note**: The Spanish text is treated as the source of truth; a legal accuracy review of both texts is outside this feature but recommended before launch (recorded in `INSTRUCCIONES-CARTAS-BILINGUES.md`).

### R13. English for analyzer findings (`issueTitle`)

- **Decision**: Every finding that can produce a letter gets a **stable key** in addition to its Spanish title (`bankruptcy`, `foreclosure`, `repossession`, `charge-off`, `collection`, `late-payments`, `past-due-amount`, `inquiries`), carried on the form as `data-issue-key` (plus `data-issue-arg` for the amount / count). The module maps keys to English (and Spanish) labels; the Spanish title attribute stays for the UI. An unknown key falls back to a neutral generic phrase ("the account or information identified as: …") and never prints the Spanish title inside the English column.
- **Rationale**: Titles are Spanish sentences produced by the analyzer; quoting them raw in the English letter would put Spanish in the letter to send (edge case in the spec).
- **Alternatives**: Translating the title string by lookup on its text (rejected: brittle, breaks when wording is edited).

### R14. Detected identity values (`Nombre` / `Teléfono` / `Dirección`)

- **Decision**: `disputedValue` JSON items keep `type` (Spanish label) and `value` (verbatim from the report). The module maps `type` → English label (`Name`, `Phone`, `Address`); `value` is never altered.
- **Rationale**: FR-023 — verbatim report text in both columns; labels are the only generated part.

### R15. Free text and the "review in English" note

- **Decision**: Fields typed freely (currently **Detalle adicional** in the bureau dispute) are copied unchanged into both columns. When that field is non-empty the result shows a note beside the English column. `accountReference`, names and addresses are proper data and do not trigger the note.
- **Rationale**: Spec US5; no AI. The note is honest about the limit instead of implying a translation.

### R16. Layout

- **Decision**: One CSS grid container per letter with two tracks. Each letter block is a `display: contents` row containing an `es` cell and an `en` cell, so on desktop paragraph N in Spanish sits beside paragraph N in English (FR-018). Under a phone breakpoint the container becomes one track and cells are ordered so **all Spanish blocks come first, then all English blocks**, each half under its own heading — stacked columns as the spec says. Headings: "Para que la entiendas — español" / "Para enviar — English"; cells carry `lang="es"` / `lang="en"`; the container is a labeled group. `@media print` hides the Spanish half so printing the page yields the English letter. Styling reuses the existing light "galería blanca" tokens already defined at the end of `credito.html` (memory: Apple design applies to this page only) — no changes to `styles.css`.
- **Alternatives**: Two independent columns (rejected: cannot align paragraphs of different height); a tabbed toggle (rejected: the request is explicit about parallel columns).

### R17. Copying

- **Decision**: The letter result keeps a visually hidden, read-only `<textarea class="cr-solution-letter">` holding the **English plain text**; the primary button "Copiar carta en inglés" copies that text (clipboard API, with the existing `select()` + `execCommand` fallback). No "copy Spanish" button is offered.
- **Rationale**: Resolves the optional FR-020 in the safest direction: a Spanish copy button can only cause the mistake the feature is trying to prevent; the person can still select and copy the Spanish text by hand if they want it. Reusing the textarea preserves the existing fallback and the existing button styling class.
- **Alternatives**: Offer both buttons (rejected, above); copy the visible English column via DOM selection (rejected: would carry labels and formatting).

### R18. Dates and formats

- **Decision**: `Intl.DateTimeFormat('es-US', …)` for Spanish (as today) and `('en-US', …)` for English, both computed from the **same `Date` instance** passed once to the module. State is the 2-letter US abbreviation in both; "Segundo apellido" empty → "No aplica" / "N/A".

### R19. Analytics

- **Decision**: On a produced draft and on a copy, call the existing `ThemoraStats.evento` with a name only (`carta-generada`, `carta-ingles-copiada`) and at most a categorical property (letter type). No letter content, ever (Constitution II, spec FR-026).

### R20. Test strategy for the letters

- **Decision**: `tests/cartas-bilingues.test.js` drives the module with fixed inputs for each of the three letter types and asserts:
  1. block count and order identical in es/en; every block non-empty in both;
  2. **fact parity** — each input fact (name, street, city, state, ZIP, phone, account reference, bureau/collector name and address lines, disputed values, free text) appears in both texts, and the date is the same calendar day;
  3. **citation parity** — `1681i` / `§ 611` in the bureau letters, `1692g` in the collector letter, in both;
  4. **no Spanish leakage** in English output beyond user-typed and report-verbatim text (a list of Spanish stop-words/labels: `Estimado`, `Atentamente`, `Asunto`, `Firma:`, `Teléfono`, …);
  5. **honesty** — neither text contains "ilegal/illegal", "debes/you must", "garant", "seguro que/guaranteed";
  6. **free-text note trigger** — `hayTextoLibre` true only when the detail is non-empty;
  7. the English text contains no column labels or notes (copy purity).
- **Rationale**: Directly encodes FR-017, FR-019–FR-024, FR-029 as automated checks (Constitution IV).

## Open questions (defaults chosen; none block planning)

| Question | Default chosen | Where to change it |
|---|---|---|
| Should the tools-page "cese de comunicación" letter also be bilingual? | No (out of scope in the spec); the module is built so a fourth letter type can be added | Future spec |
| Should there be a "copy Spanish" button? | No (R17) | `/speckit-clarify` |
| Should F5/F6 (account, business) require a signed-in session for suggestions? | No now; recorded as follow-up in Complexity Tracking | Future change if usage grows |
| Who reviews the English? | Owner arranges a fluent reviewer; checklist in `INSTRUCCIONES-CARTAS-BILINGUES.md` | FR-030 |
