---

description: "Task list for Address Autocomplete Everywhere + Side-by-Side Bilingual Letters"
---

# Tasks: Address Autocomplete Everywhere + Side-by-Side Bilingual Letters

**Input**: Design documents from `/specs/003-address-autocomplete-bilingual-letters/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The plan requires them and the project constitution (Flujo de desarrollo → Pruebas) says changes to `direccion-autocompletar.js` and any rule-based logic MUST run `node --test tests/` and pass. A failing test is reported as is; never weaken a test to make it pass.

**Organization**: Grouped by user story. Stories US1–US2 are Part A (addresses); US3–US5 are Part B (letters). Part A and Part B do not depend on each other and can be done in parallel by different people.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US5, mapped to the user stories in spec.md
- All paths are relative to the repository root `C:\Users\drcor\Desktop\MyWeb\` (flat static site; there is no `src/`)

## Global rules for every task

- Keep **LF** line endings; after editing a file run `git diff --stat <file>` and confirm the diff is not the whole file (constitution: Formato de archivos).
- Do not add a dependency, framework, build step or external origin (CSP stays unchanged).
- Never put a secret in a file; never log or send typed text; nothing is sent before the person types in an address field.
- Do **not** publish or deploy from these tasks. Publishing is an owner action listed at the end (T055–T056).
- Text shown to people is Spanish (es-US); code comments follow the surrounding file (Spanish).

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before touching anything.

- [X] T001 Run `node --test tests/` from the repo root and record the result (expected: 20 tests pass in `tests/autocompletar-direccion.test.js` plus the Zyron suite). If anything already fails, stop and report it before changing code.
- [X] T002 [P] Run `graphify query "address autocomplete wiring credito herramientas cuenta listar-negocio"` and skim the result so the touched files match the graph; note any file in it that the plan does not list.

---

## Phase 2: Foundational (blocks every user story)

**Purpose**: Make the browser script shape-aware and declaratively wired, and protect the public site. Nothing in Phases 3–8 for Part A can start before T003–T011; T012 (netlify blocks) must be done before any publish.

### Tests first (must FAIL before implementation)

- [X] T003 [P] Create `tests/direccion-formas.test.js` (header comment style like `tests/autocompletar-direccion.test.js`). It loads the script with `global.window = {}` and reads `window.ThemoraDireccion.__prueba`. Cases for `valoresParaBloque(direccion, forma)` with `direccion = { calle, ciudad, estado, cp }`:
  - `separado` → `{ calle, ciudad, estado, cp }` unchanged.
  - `estado-cp` with estado `VA` and cp `24016` → `{ calle, ciudad, estadoCp: 'VA 24016' }`; with only estado → `'VA'`; with only cp → `'24016'`; with neither → `estadoCp` absent or empty.
  - `unico` full → `'123 Main St, Roanoke, VA 24016'`; missing ciudad → `'123 Main St, VA 24016'`; missing cp → `'123 Main St, Roanoke, VA'`; only calle → `'123 Main St'`; no dangling commas or double spaces in any case.
  - Empty strings from the service are never written (returned object omits them).
  - ZIP+4 (`24016-1234`) is preserved.
  Also assert loading the script under Node does **not** throw when `document` is undefined.

### Implementation of the shape-aware, declarative script

- [X] T004 Refactor `direccion-autocompletar.js`: move the body of `conectar(form, opciones)` into a new internal `conectarBloque(campos, cfg)` that receives already-resolved element references (`calle`, optional `ciudad`, `estado`, `cp`, `estadoCp`) plus `{ tipo, forma }`. Replace the per-form guard `form.dataset.tdaListo` with a guard on the street input (`calle.dataset.tdaListo === '1'`) so several blocks can coexist in one form (research R4). Each block keeps its own `uid`, list, status line, `sesion` token, `turno`, timers and AbortController (already per-call closure state — keep it that way).
- [X] T005 In `direccion-autocompletar.js` add the pure function `valoresParaBloque(direccion, forma)` implementing exactly the table in `data-model.md` ("Composed values per shape"); never return empty-string values; export it as `ThemoraDireccion.__prueba = { valoresParaBloque }` and add `if (typeof module !== 'undefined' && module.exports) module.exports = window.ThemoraDireccion;` after the existing `window.ThemoraDireccion = …` line. Guard every top-level use of `document`/`window.crypto` so `require()` under Node works (only touch `document` inside functions and inside `if (typeof document !== 'undefined')`).
- [X] T006 In `direccion-autocompletar.js` change `elegir(i)` so that after the `detalle` response it fills the block using `valoresParaBloque(d, forma)`: `separado` → `campos.calle/ciudad/estado/cp`; `estado-cp` → `campos.calle/ciudad/estadoCp`; `unico` → `campos.calle` only. Keep `poner()` (sets value, dispatches `input` and `change`), keep `rellenando` guard, `sesion = nuevaSesion()`, the status messages and the `autocompletar-direccion-usado` analytics event (name only).
- [X] T007 In `direccion-autocompletar.js` make the notice text depend on `cfg.tipo`: `persona` keeps the current text ("Al escribir tu calle y número te sugerimos direcciones con Google: solo eso que escribes se consulta, y también puedes escribir todo a mano."); `cobrador` → "Al escribir la dirección de la agencia te sugerimos direcciones con Google: solo eso que escribes se consulta, y también puedes escribir todo a mano."; `negocio` → "Al escribir la dirección de tu negocio te sugerimos direcciones con Google: solo eso que escribes se consulta, y también puedes escribir todo a mano." Keep the notice directly above the street field (`contenedorCalle`: closest `.cr-solution-field`, else `.cd-field`, else `.form-group`, else `parentNode`).
- [X] T008 In `direccion-autocompletar.js` add `resolverBloque(calleInput)`: reads `data-dir-calle` (group token) and `data-dir-tipo` (default `persona`); finds siblings with `form.querySelector('[data-dir-ciudad="<grupo>"]')`, `[data-dir-estado=…]`, `[data-dir-cp=…]`, `[data-dir-estado-cp=…]` inside the closest `form` (or the closest `[data-dir-scope]` ancestor, else `calleInput.parentNode`); infers `forma` (`ciudad`+`estado`+`cp` → `separado`; `ciudad`+`estado-cp` → `estado-cp`; otherwise `unico`); then calls `conectarBloque`. Expose it as `ThemoraDireccion.conectarBloque(calleInput)`.
- [X] T009 In `direccion-autocompletar.js` register ONE delegated listener at load: `document.addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches('[data-dir-calle]')) ThemoraDireccion.conectarBloque(t); })`, inside `if (typeof document !== 'undefined')`. Wiring performs no network request (rule 1 of the file header must still hold).
- [X] T010 In `direccion-autocompletar.js` keep the legacy `ThemoraDireccion.conectar(form, opciones)` working for name-based `separado` forms (same `campos` override option as today) by resolving the elements and calling `conectarBloque` with `{ tipo: 'persona', forma: 'separado' }`; it must remain idempotent per street input. Update the file's header comment: remove mention of "un formulario de carta (credito.html)" only, describe the `data-dir-*` markup and shapes (see `contracts/address-form-markup.md`), keep the four rules.
- [X] T011 Run `node --test tests/direccion-formas.test.js` and then `node --test tests/`; T003 must now pass and the 20 existing address-service tests must still pass unchanged.

### Public-site protection (gate G-BLOCK)

- [X] T012 [P] Edit `netlify.toml`: add `[[redirects]]` 404-style blocks in the exact style of the existing ones (`from`, `to = "/index.html"`, `status = 301`, `force = true`, same as the current `INSTRUCCIONES-*.md` rules) for: `/specs/*`, `/.specify/*`, `/.claude/*`, `/graphify-out/*`, `/CLAUDE.md`, `/skills-lock.json`, `/INSTRUCCIONES-PAGOS.md`, `/INSTRUCCIONES-DIRECCIONES.md`, `/INSTRUCCIONES-CARTAS-BILINGUES.md`, plus a short Spanish comment above the group explaining why (everything at the root is public). Do not touch the CSP header line. Verify with `grep -n` that each path appears once.

**Checkpoint**: The script understands three shapes and several blocks per form, tests pass, internal files are blocked. No form is wired yet.

---

## Phase 3: User Story 1 — Suggestions appear in every form that asks for an address (Priority: P1) 🎯 MVP (Part A)

**Goal**: F1–F6 all offer suggestions and fill the fields each form has (spec FR-001–FR-006, FR-012–FR-014).

**Independent Test**: With the service reachable, on each of F1–F6 type ≥ 4 characters of a real US address in its street field, confirm suggestions, choose one, confirm the right fields fill (quickstart A1–A6, A8).

### Tests for User Story 1

- [X] T013 [P] [US1] Create `tests/formularios-direccion.test.js` implementing the "Coverage test contract" in `contracts/address-form-markup.md`: read every `*.html` in the repo root as text; find field definitions whose `id` or `name` matches `/street|calle|direccion|address/i` (also inside JS template strings, e.g. the ones in `credito.html`); each must carry `data-dir-calle` on the same tag or be in an explicit allowlist object `{ archivo, patron, razon }` (initial entries: the hidden Netlify static form at `listar-negocio.html` lines ~419-433 — server-side form detection copy, not user-visible; add only entries you can justify in `razon`). Also assert: every page containing `data-dir-calle` includes `<script src="direccion-autocompletar.js">`; no `cobrador` block shares a group token with a `persona` block in the same page; the expected list of wired fields is exactly F1–F6 (assert the presence of `data-dir-calle` on `name="street"` and `name="collectorStreet"` in `credito.html`, `#cdStreet` and `#cdCollectorStreet` in `herramientas.html`, `#profileAddress` in `cuenta.html`, `#lnDireccion` in `listar-negocio.html`). It must FAIL now.

### Implementation for User Story 1 (each form edit is a different file → parallel)

- [X] T014 [P] [US1] `credito.html`, `personalFieldsHtml(formId)` (~lines 1400-1410): add `data-dir-calle="persona" data-dir-tipo="persona"` to the `street` input, `data-dir-ciudad="persona"` to `city`, `data-dir-estado="persona"` to `state`, `data-dir-cp="persona"` to `postalCode`. Do not change ids, names, required, maxlength, pattern or `list`.
- [X] T015 [US1] `credito.html`, `renderDebtValidationForm(item,formId)` (~lines 1448-1452): add `data-dir-calle="cobrador" data-dir-tipo="cobrador"` to `collectorStreet`, `data-dir-ciudad="cobrador"` to `collectorCity`, `data-dir-estado="cobrador"` to `collectorState`, `data-dir-cp="cobrador"` to `collectorPostalCode`. (Same file as T014 → do after it.)
- [X] T016 [US1] `credito.html` (~lines 1558-1564): delete the per-page glue (`results.addEventListener('focusin', …ThemoraDireccion.conectar(carta) …)`) and its comment block, replacing the comment with one line: "El autocompletado se conecta solo con los atributos data-dir-* (ver direccion-autocompletar.js)." Confirm `<script src="direccion-autocompletar.js">` at ~line 1870 stays.
- [X] T017 [US1] `credito.html`, `personalFieldsHtml` note (~line 1409): replace the stale sentence "Aparte, el autocompletado de arriba solo envía algo si tú lo activas." with "Aparte, mientras escribes la calle te sugerimos direcciones con Google; solo se consulta lo que escribes ahí." Keep the first sentence about the Google Maps button unchanged (spec FR-012).
- [X] T018 [P] [US1] `herramientas.html` (~lines 754-757 person, ~761-764 collector): add `data-dir-calle="persona" data-dir-tipo="persona"` on `#cdStreet`, `data-dir-ciudad/estado/cp="persona"` on `#cdCity`, `#cdState`, `#cdZip`; add `data-dir-calle="cobrador" data-dir-tipo="cobrador"` on `#cdCollectorStreet`, `data-dir-ciudad/estado/cp="cobrador"` on `#cdCollectorCity`, `#cdCollectorState`, `#cdCollectorZip`. Add `<script src="direccion-autocompletar.js"></script>` right after `<script src="auth.js"></script>` (~line 953). The form's submit handler reads by `name` and is not changed.
- [X] T019 [P] [US1] `cuenta.html` (~lines 330-332): `#profileAddress` gets `data-dir-calle="persona" data-dir-tipo="persona"`, `#profileCity` gets `data-dir-ciudad="persona"`, `#profileState` gets `data-dir-estado-cp="persona"` (shape `estado-cp`: fills e.g. `VA 24016`). Add `<script src="direccion-autocompletar.js"></script>` right after `<script src="cms.js"></script>` (~line 430). Do not change the profile save code (~lines 738-740); it reads `.value`, and the script dispatches `input`/`change`.
- [X] T020 [P] [US1] `listar-negocio.html` (~line 273): `#lnDireccion` gets `data-dir-calle="negocio" data-dir-tipo="negocio"` (shape `unico`: fills `street, city, ST ZIP`). Add `<script src="direccion-autocompletar.js"></script>` right after `<script src="cms.js"></script>` (~line 450). Do not touch the hidden static form fields (~lines 419-433).
- [X] T021 [P] [US1] `privacidad.html` (gate G-PRIV): rewrite the section "Autocompletar la dirección con Google" (~lines 198-203) so it names every form where street text is sent — the credit-analyzer letters (your address and the collection agency's), the collector-contact letter on the tools page (both), the account profile address, and the business address on the list-your-business page — keeps "no guardamos ni registramos lo que escribes", "no ve tu dirección IP", "nada sale antes de que escribas", the manual-entry sentence, and the Google Maps button sentence. Update the third-party table row (~line 343) to the same list. Keep tone and structure of the page; do not claim opt-in.
- [X] T022 [US1] Run `node --test tests/formularios-direccion.test.js` (T013 must now pass), then `node --test tests/`. Fix wiring, not the test, if it fails.
- [X] T023 [US1] Local browser check with `netlify dev` (or, if the Netlify CLI or key is unavailable, stub the service by intercepting `POST /.netlify/functions/autocompletar-direccion` in DevTools): walk quickstart A1–A6 and A8 on `credito.html`, `herramientas.html`, `cuenta.html`, `listar-negocio.html` at 1280 px and 360 px. Confirm: no request before typing (A1); person block vs collector block fill independently (A3, A4); `VA 24016` in the merged field (A5); single-line address in the business field (A6); everything remains editable and the forms still submit. Report anything not verifiable in this environment instead of claiming it passes.

**Checkpoint**: US1 is complete and independently demonstrable (once the service is published — see US2 and T046).

---

## Phase 4: User Story 2 — The owner and the person can tell when suggestions can't appear (Priority: P1)

**Goal**: One-command service check that separates "not published" from "not configured"; the page stops hammering a dead service and says why to the owner via console, plain note to the person (spec FR-007, FR-011, US2).

**Independent Test**: Run the `estado` check against a local/published function; simulate 404 in DevTools and confirm one note and no repeated requests (quickstart A7, step 3).

### Tests for User Story 2

- [X] T024 [P] [US2] Extend `tests/autocompletar-direccion.test.js` with the cases in `contracts/address-service.md` → "Tests": `estado` with no key → 200 `{ vivo: true, configurado: false }` and **zero** outbound `fetch` calls; `estado` with key → `configurado: true`, zero outbound calls, response body does not contain the test key string; `estado` from a foreign origin → 403; `estado` via GET → 405; `estado` needs no `sesion`; the per-IP limit still counts `estado`. Must FAIL now; the 20 existing tests stay untouched.

### Implementation for User Story 2

- [X] T025 [US2] `netlify/functions/autocompletar-direccion.js`, `exports.handler`: reorder to method → origin → parse body → **if `cuerpo.accion === "estado"` respond `200 { vivo: true, configurado: !!googleApiKey() }` (still `no-store`, still counted by `dentroDelLimite` for the IP, no `sesion` needed)** → then the existing key check (503 `noConfigurado`), session validation, limits and Google actions exactly as today. Keep the 400 for unparsable JSON. Do not change any other response.
- [X] T026 [US2] `netlify/functions/autocompletar-direccion.js` header comment: replace the text that says the person "puede activar «Autocompletar con Google»" and "Solo se llama cuando la persona activó la casilla" with the current behavior (suggestions appear as the person types in a marked street field; nothing is sent before typing), and add a two-line note about the `estado` action. No code change in this task.
- [X] T027 [US2] Run `node --test tests/autocompletar-direccion.test.js`; T024 passes and all 20 original tests pass unchanged.
- [X] T028 [US2] `direccion-autocompletar.js`, inside the `pedir()` response handling: treat HTTP 404, 403 and 405 like `noConfigurado`/`noDisponible`/5xx → call `apagarPorFalla('El autocompletado no está disponible ahora. Escribe la dirección a mano.')` (turns this block off for the visit, restores `autocomplete`, stops requests). For 404 also `console.warn('[direccion] El servicio de direcciones no está publicado (404). Ver INSTRUCCIONES-DIRECCIONES.md')` — a fixed message, never the typed text. Apply the same status handling in `elegir()`'s `detalle` response (`!r.res.ok` → note, and turn off on 404/403/405). Keep 429 as "close list + note, stay on" and network errors as "note, stay on".
- [X] T029 [US2] Verify T028 in the browser: in DevTools block the request or run `netlify dev` without the key; type in a street field → exactly one request, the note appears, further typing sends nothing, you can complete and submit the form by hand (quickstart A7). Report what could not be checked.
- [X] T030 [P] [US2] Create `INSTRUCCIONES-DIRECCIONES.md` in plain Spanish (style of the existing `INSTRUCCIONES-*.md`): what the feature does and on which forms; **Paso 1** publish with `netlify deploy --prod` and confirm `autocompletar-direccion` is in the Functions list; **Paso 2** the one-command check (`curl -s -X POST -H "Origin: https://mithemora.com" -H "Content-Type: application/json" -d '{"accion":"estado"}' https://mithemora.com/.netlify/functions/autocompletar-direccion`) with the interpretation table from `contracts/address-service.md` (404 / 403 / 405 / `configurado:false` / `configurado:true`); **Paso 3** Google Cloud: enable "Places API (New)", billing on, key stored as `GOOGLE_PLACES_API_KEY` in Netlify (same key `revisar-negocio` uses), key without HTTP-referrer restriction (calls come from Netlify servers), restrict by API instead; **Paso 4 (obligatorio)** set a daily quota for Places API (New) because the in-memory limits are per function instance; **Paso 5** the browser check from `quickstart.md`; a "Si algo falla" list mapped to spec 002 causes C1–C8; and a sentence that the pages must not be advertised as having address help until Paso 2 says `configurado:true`. Confirm this file is covered by the T012 block rule.

**Checkpoint**: US1 + US2 = Part A complete. The owner can verify production in one command.

---

## Phase 5: User Story 3 — I see my letter in Spanish and English side by side (Priority: P1) (Part B)

**Goal**: Each of the three letter drafts on the credit analyzer shows two labeled, block-aligned columns generated from the same data (spec FR-015–FR-019, FR-021, FR-023–FR-025, FR-028; US3).

**Independent Test**: Fill each of the three letter forms, submit, and compare the columns (quickstart B1, B2, B5, B6, B8).

### Tests for User Story 3

- [X] T031 [P] [US3] Create `tests/cartas-bilingues.test.js` (loads `cartas-bilingues.js` under Node; header comment explaining it mirrors constitution IV). Use fixed inputs for all three types (`identity` with each of the 4 subtypes, `bureau-dispute` with each of the 6 reasons, `debt-validation` with and without `referencia`), a fixed `Date`, and assert per `research.md` R20: (1) block ids and count identical in `es`/`en` and no block has an empty language side; (2) **fact parity** — legal name, street, city, state, ZIP, phone, account reference, bureau/collector name and address lines, disputed-value `value`s, and `detalle` appear in BOTH `textoEs` and `textoEn`, and the date is the same calendar day in both (e.g. `20 de septiembre de 2026` / `September 20, 2026`); (3) **citation parity** — `1681i` and `§ 611` (bureau letters, incl. `611(d)`), `1692g` (collector letter) appear in both; the numbers 30 (days), 5 (business days), 6 months and 2 years appear in both bureau-dispute texts; (4) **no Spanish leakage** in `textoEn`, ignoring user/report-verbatim inputs: none of `Estimado`, `Atentamente`, `Asunto`, `Firma:`, `Teléfono`, `Nombre legal`, `Dirección actual`, `Ciudad:`, `Estado:`, `Código postal`, `No aplica`, and no character from `áéíóúñ¿¡` in the generated wording (use inputs without accents for this check); (5) **honesty** — neither language contains `ilegal|illegal|debes|you must|garantiz|guarantee`; (6) unknown finding key → English uses the generic fallback phrase and the Spanish title text never appears in `textoEn`; (7) `textoEn` contains no column labels ("Para enviar", "Para que la entiendas") and no note text. Must FAIL now (module missing).
- [X] T032 [P] [US3] Add to the same test file (or a `describe` block) the mapping checks: every value of `ETIQUETAS_HALLAZGO` keys `bankruptcy`, `foreclosure`, `repossession`, `charge-off`, `collection`, `late-payments`, `past-due-amount`, `inquiries` has non-empty `es` and `en`; `ETIQUETAS_TIPO_DATO` maps `Nombre`→`Name`, `Teléfono`→`Phone`, `Dirección`→`Address`; `MOTIVOS` has the six reason keys with non-empty `es` and `en`.

### Implementation: the module (sequential — one file)

- [X] T033 [US3] Create `cartas-bilingues.js` at the repo root. Header comment (Spanish): what it is, the paired-block rule, "sin IA, sin red, sin guardar nada", `TODO(NATIVE_REVIEW): el inglés lo escribió Claude; falta revisión de un hablante nativo (Principio V)`. Wrap as an IIFE exposing `window.ThemoraCartas` and `module.exports` under Node (same guard as `zyron-leyes.js`, and no `document` access). Implement `formatearFecha(fecha, idioma)` with `Intl.DateTimeFormat('es-US'|'en-US', { day:'numeric', month:'long', year:'numeric' })`, and the exported maps `ETIQUETAS_HALLAZGO`, `ETIQUETAS_TIPO_DATO`, `MOTIVOS` from `data-model.md` §3 and §2. Reason sentences: Spanish copied verbatim from `DISPUTE_REASON_TEXT` in `credito.html` (~lines 1485-1492); English = equivalent statements ("This account is not mine and I do not recognize it as an obligation I incurred.", etc.).
- [X] T034 [US3] In `cartas-bilingues.js` implement `armar('identity', datos)` with the blocks `remitente · fecha · destinatario · asunto · saludo · apertura · disputados · correcta · adjuntos · declaracion · firma`. Spanish lines are copied **verbatim** from `submitIdentityCorrection` in `credito.html` (~lines 1655-1694) including the four `identityCorrectionSubject` phrases (~lines 1475-1483); English is the formal equivalent ("Dear <Bureau> Dispute Team:", "Subject: Formal request to correct personal information in my <Bureau> credit report", "INFORMATION I AM DISPUTING:", "MY CORRECT INFORMATION:" with Legal name / First name(s) / First surname / Second surname (`N/A`) / Current address / Street and number / City / State / ZIP code / Current phone, enclosures, declaration, "Sincerely,", "Signature: ____", name). Disputed lines are `- <label>: <value>` with label mapped by `ETIQUETAS_TIPO_DATO` and `value` verbatim.
- [X] T035 [US3] In `cartas-bilingues.js` implement `armar('bureau-dispute', datos)` with blocks `remitente · fecha · destinatario · asunto · saludo · apertura · motivo · [detalle] · fcra-investigacion · fcra-notificacion · mi-informacion · adjuntos · declaracion · firma`. Spanish verbatim from `submitBureauDispute` (~lines 1721-1757), with the finding label taken from `ETIQUETAS_HALLAZGO[hallazgo.clave]` (Spanish label = the analyzer's current Spanish title text for that key, with `hallazgo.arg` appended where the title has an amount/count) and the fallback for unknown keys. English legal paragraphs state the same requests and citations as the Spanish: FCRA § 611 (15 U.S.C. § 1681i) reinvestigation within 30 days, deletion/correction if not verified, written result within 5 business days with a free updated report, and § 611(d) notification of persons who received the report in the last 6 months (2 years for employment). No "illegal", no "you must", no outcome promises. The `detalle` block (only when non-empty) has `libre: true` and the text verbatim in both languages ("Additional detail: …" / "Detalle adicional: …").
- [X] T036 [US3] In `cartas-bilingues.js` implement `armar('debt-validation', datos)` with blocks `remitente · fecha · cobrador · asunto · saludo · apertura · lista-validacion · no-reconocimiento · mi-informacion · firma`. Spanish verbatim from `submitDebtValidation` (~lines 1781-1818); English cites the Fair Debt Collection Practices Act (15 U.S.C. § 1692g), keeps the four validation items, the "not an acknowledgment of the debt nor a promise to pay" paragraph and the request to suspend collection while the debt is validated. `referencia` (optional) appears in subject and opening in both languages when present.
- [X] T037 [US3] In `cartas-bilingues.js` make `armar` return `{ bloques, textoEs, textoEn, hayTextoLibre }`: `textoEs`/`textoEn` join each language's blocks with a blank line between blocks and `\n` between lines (same shape as today's letters); `hayTextoLibre = bloques.some(b => b.libre)`; `textoEn` must contain no labels or notes. Run `node --test tests/cartas-bilingues.test.js` — T031/T032 must pass; fix the module, never the test.

### Implementation: the analyzer UI

- [X] T038 [US3] `credito.html`, analyzer: give findings that produce a letter a stable key. Extend `addNegative(priority,title,description,action,evidence,solutionType=null,detectedValues=[])` (~line 1287) with an 8th parameter `issueKey=null` and an optional 9th `issueArg=''`; pass `'bankruptcy'`, `'foreclosure'`, `'repossession'`, `'charge-off'`, `'collection'`, `'late-payments'` (the "Pagos atrasados" finding), `'past-due-amount'` (arg = the formatted amount from `money(pastDueAmount)`), `'inquiries'` (arg = the count) in the calls at ~lines 1338-1347; copy `issueKey`/`issueArg` into the `strategies.push({ … })` at ~line 1373; in `renderStrategy` (~line 1470) add `data-issue-key` and `data-issue-arg` (escaped with `escapeHtml`) next to the existing `data-issue-title`. Do not change any Spanish title, description or ordering.
- [X] T039 [US3] `credito.html`: add `<script src="cartas-bilingues.js"></script>` next to the existing `<script src="direccion-autocompletar.js">` (~line 1870).
- [X] T040 [US3] `credito.html`: replace the three letter-building arrays in `submitIdentityCorrection`, `submitBureauDispute` and `submitDebtValidation` (~lines 1623-1818) with calls to `ThemoraCartas.armar(tipo, datos)`. Keep all validation and alert messages exactly as they are today (bureau chosen, at least one disputed value, reason chosen, collector fields complete); build `datos` from `FormData` using the existing `readPersonalInfo` values plus `fecha: new Date()`, `buro: CREDIT_BUREAUS[key]` mapped to `{ nombre, destinatario, direccion }`, `hallazgo: { clave: form.dataset.issueKey, arg: form.dataset.issueArg }`, `valoresDisputados`, `motivo`, `detalle`, `cobrador`, `referencia`. Then call one shared `renderCarta(form, resultado)` (next task). Remove the now-unused inline date/letter code.
- [X] T041 [US3] `credito.html`: implement `renderCarta(form, resultado)` and update the three result templates (`renderIdentityForm` ~line 1421, `renderBureauDisputeForm` ~1442, `renderDebtValidationForm` ~1458) to the markup in `contracts/bilingual-letter.md` "Result markup": keep the existing `<strong>Borrador de …</strong>` heading text; add `.cr-letter-pair` (`role="group"`, `aria-label="Carta en español y en inglés"`) with heads "Para que la entiendas — español" / "Para enviar — English"; one `.cr-letter-row` per block with `.cr-letter-cell.es` (`lang="es"`) and `.cr-letter-cell.en` (`lang="en"`) each containing one `<p>` per line block (lines joined with `<br>`), built with `textContent`/`escapeHtml` (never `innerHTML` with raw values); a visually hidden read-only `<textarea class="cr-solution-letter" lang="en" aria-label="Carta en inglés para enviar">` holding `resultado.textoEn`; `renderCarta` replaces both columns together on every submit. The disclaimer paragraph `.cr-letter-disclaimer` says: "Borrador educativo, no es asesoría legal. La versión en inglés es la que se envía y tú eres responsable de revisarla antes de enviarla."
- [X] T042 [US3] `credito.html` CSS (in the `<style>` block, using the existing light "galería blanca" tokens at the end of the block, no changes to `styles.css`): `.cr-letter-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 18px}`, `.cr-letter-row{display:contents}`, cells with white background, 10-14px padding, 1px hairline border and `overflow-wrap:anywhere`, heads styled as small labels; `.cr-solution-letter` visually hidden (clip technique, not `display:none`, so it stays focusable for the copy fallback); at `max-width:720px`: `.cr-letter-pair{grid-template-columns:1fr}` with `order` so Spanish head → all Spanish cells → English head → all English cells; in `@media print` hide `.cr-letter-cell.es` and `.cr-letter-head.es` and the note/disclaimer buttons as appropriate (English letter only). The existing `@media print` rule at ~line 288 already hides much of the page; keep it working.
- [X] T043 [US3] Manual check (quickstart B1, B2, B5, B6, B8): produce each of the three letters at 1280 px and 360 px; confirm two labeled columns, aligned blocks on desktop, stacked Spanish-then-English on phone with no horizontal scroll, print preview shows only English, re-submitting refreshes both columns together. Also open two different letter forms in the same analysis and confirm drafts do not mix.

**Checkpoint**: US3 works with the current single copy button still copying the textarea (which now holds English). US4 finishes the copy behavior and labels.

---

## Phase 6: User Story 4 — I copy only the English letter (Priority: P1)

**Goal**: The primary action copies the English letter only, with clear labels and the existing fallback; no Spanish copy button (spec FR-020, FR-021, FR-026; research R17).

**Independent Test**: Press the copy button and paste elsewhere: only the English letter (quickstart B3, B7).

- [X] T044 [US4] `credito.html`: rename the result buttons to "Copiar carta en inglés" in all three templates; update the `.cr-copy-solution` click handler (~lines 1585-1595) so it copies `textarea.value` of the hidden English textarea (already English from T041), sets the success label to "Carta en inglés copiada" for 1.8 s then back to "Copiar carta en inglés", and on failure makes the textarea visible (remove the visually-hidden class), focuses and selects it, and sets the label to "Selecciona y copia el texto". Add no second copy button. Fire `window.ThemoraStats && ThemoraStats.evento('carta-ingles-copiada', { tipo })` and, in `renderCarta`, `ThemoraStats.evento('carta-generada', { tipo })` where `tipo` is the letter type only; guard for `ThemoraStats` being absent; send no letter content.
- [X] T045 [US4] Manual check (B3, B7): paste the clipboard into a plain-text editor for each letter type → English only, no labels, no Spanish, no notes; with the Clipboard API unavailable (insecure context or forced failure) the fallback shows and selects the English text; Network tab shows no request carrying letter content.

**Checkpoint**: US3 + US4 = the letter feature the owner asked for.

---

## Phase 7: User Story 5 — Text the person wrote is handled honestly (Priority: P2)

**Goal**: Free text is copied unchanged to both columns and flagged for English review when present (spec FR-022; US5).

**Independent Test**: Fill "Detalle adicional" with Spanish text → note appears and text is identical in both columns; leave it empty → no note (quickstart B4).

- [X] T046 [US5] Add to `tests/cartas-bilingues.test.js`: `hayTextoLibre` is `true` only for `bureau-dispute` with a non-empty `detalle` (also whitespace-only → `false`); the `detalle` string appears unchanged in both `textoEs` and `textoEn`; for `identity` and `debt-validation` `hayTextoLibre` is always `false`; accents, `#` and quotes in `detalle` and in street values pass through unchanged. Confirm it passes against T035's behavior (fix the module if not).
- [X] T047 [US5] `credito.html`, `renderCarta`: when `resultado.hayTextoLibre` is true, show `.cr-letter-note` directly under the English column heading area with the exact text "La línea «Detalle adicional» está en tus propias palabras. Revísala o escríbela en inglés antes de enviar."; when false, remove/hide it (so re-submitting after clearing the field removes the note). Add its CSS (subtle, readable, `role="note"`) in the same style block.
- [X] T048 [US5] Manual check (B4): with detail in Spanish → note visible and text identical in both columns; empty → no note; with detail then cleared and resubmitted → note gone.

**Checkpoint**: All five user stories complete.

---

## Phase 8: Polish, gates and hand-off

**Purpose**: Documentation, full verification, graph, and owner-only steps.

- [X] T049 [P] Create `INSTRUCCIONES-CARTAS-BILINGUES.md` in plain Spanish: how the three letters are built (one list of paired blocks in `cartas-bilingues.js`), how to change a paragraph (edit `es` and `en` together and run `node --test tests/`), how finding keys map to English labels, the free-text rule, that nothing is sent anywhere, and a **native-review checklist** (fluent reviewer confirms the English of each of the three letters; legal reviewer confirms the FCRA/FDCPA wording of both languages) with a place to record who reviewed and when. State that until the review is recorded the page keeps the "review before sending" note and claims no professional review (constitution V, spec FR-030). Confirm the file is blocked by T012.
- [X] T050 [P] Search for and fix any remaining stale wording that describes address suggestions as opt-in: `grep -rn -i "casilla\|solo envía algo si\|si tú lo activas\|activar.*autocompletado\|Autocompletar con Google" *.html *.js netlify/functions/*.js` — update anything user-visible or misleading, and report anything you intentionally leave.
- [X] T051 Run the full suite `node --test tests/` and report the real result (expected: all pass — address function, address shapes, form coverage, bilingual letters, Zyron). Do not weaken any test to pass.
- [X] T052 Line-ending and diff hygiene: `git diff --stat` for every file touched by this feature (`direccion-autocompletar.js`, `cartas-bilingues.js`, `credito.html`, `herramientas.html`, `cuenta.html`, `listar-negocio.html`, `privacidad.html`, `netlify.toml`, `netlify/functions/autocompletar-direccion.js`, the tests, the two `INSTRUCCIONES-*.md`); no file shows a whole-file rewrite; fix CRLF if introduced.
- [X] T053 Run `graphify update .` (constitution: Grafo de conocimiento) and mention any new node warnings.
- [X] T054 Walk `quickstart.md` sections 1, 2 and 4 that can be done locally and produce a short report: each item pass / fail / not verifiable here (with the reason). Do not claim checks that were not run.
- [ ] T055 **OWNER ACTION — do not run without the owner's explicit go-ahead (publishing is outward-facing):** publish with `netlify deploy --prod`, then run the `estado` check from `INSTRUCCIONES-DIRECCIONES.md` Paso 2 and confirm `{"vivo":true,"configurado":true}`; confirm `https://mithemora.com/specs/…`, `/CLAUDE.md` and `/INSTRUCCIONES-DIRECCIONES.md` no longer serve their content; set the daily Places quota in Google Cloud (Paso 4).
- [ ] T056 **OWNER ACTION:** run the live browser pass (`quickstart.md` section 4: A1–A8, B1–B8) and arrange the native-level English review recorded in `INSTRUCCIONES-CARTAS-BILINGUES.md`.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)** → no dependencies.
- **Phase 2 (Foundational)** → after Phase 1. T003 (test) before T004–T010; T004→T005→T006→T007→T008→T009→T010 are sequential (same file); T011 verifies; **T012 is independent [P]** (`netlify.toml`) and must be done before any publish.
- **Part A**: US1 (Phase 3) and US2 (Phase 4) depend on Phase 2. US1 tasks T014–T021 touch different files and can run in parallel (T014→T015→T016→T017 are sequential because they all edit `credito.html`). US2's function work (T024–T027) is independent of US1; T028 edits `direccion-autocompletar.js` so it goes after Phase 2 (and after T011).
- **Part B**: US3 (Phase 5) has **no dependency on Phase 2 or Part A**; it can start right after Phase 1. Inside US3: tests T031/T032 first; T033→T037 sequential (one file); T038–T042 edit `credito.html` and are sequential; T039/T042 could be batched with T041 if done by one person.
- **US4** depends on US3 (T041 markup). **US5** depends on US3 (T035 `libre` flag, T041 markup) and is independent of US4 except both edit `credito.html` (do sequentially).
- **Phase 8** after all desired stories; T049/T050 are [P].

### User story dependencies

- **US1** (P1): after Phase 2. No dependency on other stories. MVP for Part A.
- **US2** (P1): after Phase 2. Independent of US1 (verifies the same service the forms use).
- **US3** (P1): independent of Part A. MVP for Part B.
- **US4** (P1): needs US3.
- **US5** (P2): needs US3.

### Within each story

Tests first and failing → implementation → verification task → checkpoint.

## Parallel opportunities

- After Phase 1: **Part A (Phase 2→4) and Part B (Phase 5→7) can run in parallel** with two people or two sessions — they share only `credito.html`, so coordinate T014–T017 vs T038–T042 (do all Part A edits to `credito.html` first, or merge carefully).
- Phase 2: T003 [P] with T012 [P].
- Phase 3: T013 [P]; then T014-chain, T018, T019, T020, T021 in parallel (five different files).
- Phase 4: T024 [P] with T030 [P].
- Phase 5: T031 [P] with T032 [P] (same file — do together), then T033–T037.
- Phase 8: T049 [P] with T050 [P].

### Parallel example: User Story 1

```text
Task: "T018 [P] [US1] herramientas.html data-dir-* + script tag"
Task: "T019 [P] [US1] cuenta.html data-dir-* + script tag"
Task: "T020 [P] [US1] listar-negocio.html data-dir-* + script tag"
Task: "T021 [P] [US1] privacidad.html text update"
Task: "T014→T017 credito.html (sequential chain)"
```

## Implementation strategy

### MVP first

1. Phase 1 + Phase 2 (shape-aware script, blocks in `netlify.toml`).
2. Phase 3 (US1) + Phase 4 (US2): all six forms wired and the service verifiable → **Part A MVP**. It only helps real users after the owner publishes (T055).
3. In parallel or next: Phase 5 (US3) + Phase 6 (US4) → **Part B MVP** (two columns, copy English only).
4. Phase 7 (US5) and Phase 8 (polish, docs, graph).

### Incremental delivery

- Delivery 1: T012 + US2 function/docs (owner can publish and verify the service, fixing D1 with nothing else changed).
- Delivery 2: Foundational script + US1.
- Delivery 3: US3 + US4 (+ US5).

## Notes

- `[P]` = different files, no dependency on unfinished work. `[USn]` maps to spec.md stories.
- Spanish text shown to people is copied verbatim from the current letters wherever the spec says "preserve"; the English is the only new legal-language text and is pending native review (constitution V).
- Commit after each phase or logical group, one purpose per commit; never publish with uncommitted or unreviewed changes (constitution: Cambios por partes pequeñas). Commits happen only when the owner asks.
