# Data Model: Address Autocomplete Everywhere + Bilingual Letters

No database changes and nothing new is stored. These are the in-page structures the code and the tests share.

## 1. Address block (Part A)

One address block = the fields in a form that together hold one address.

| Field | Type | Notes |
|---|---|---|
| `tipo` | `persona` \| `cobrador` \| `negocio` | Chooses the notice wording; whose address it is |
| `forma` | `separado` \| `estado-cp` \| `unico` | Which fields exist (research R3) |
| `calle` | text input (required to wire) | The only field whose text is ever sent |
| `ciudad` | text input (optional) | Present in `separado`, `estado-cp` |
| `estado` | text input (optional) | Present in `separado` |
| `cp` | text input (optional) | Present in `separado` |
| `estadoCp` | text input (optional) | Present in `estado-cp` (state and ZIP together) |
| Wiring state | flag on the `calle` input | One per block, so several blocks can live in one form (R4) |
| Session token | 16–80 chars `[A-Za-z0-9_-]` | One per typed address; renewed after a choice |
| Visits state | `activo` / `apagado` | `apagado` after service failure for the rest of the visit (R5) |

**Rules**

- A block is wired only if its `calle` field is marked (contract: [address-form-markup.md](./contracts/address-form-markup.md)).
- Filling skips absent fields without error; empty values from the service are never written (existing behavior kept).
- Only `calle` text goes to the service; nothing goes before the person types there.

### Address suggestion (returned by the service, unchanged)

| Field | Meaning |
|---|---|
| `id` | Opaque place identifier |
| `principal`, `secundario` | Two display lines for the list (max 5 suggestions) |

### Address detail (returned by the service, unchanged)

`{ calle, ciudad, estado (2 letters), cp (5 or ZIP+4), completa: boolean }`

### Composed values per shape (pure function `valoresParaBloque`)

| `forma` | Output |
|---|---|
| `separado` | `{ calle, ciudad, estado, cp }` |
| `estado-cp` | `{ calle, ciudad, estadoCp: "<estado> <cp>" }` — omit whichever is empty, trim |
| `unico` | `{ calle: "<calle>, <ciudad>, <estado> <cp>" }` — omit empty parts, no dangling commas |

## 2. Letter (Part B)

### Letter input (`datos`)

| Field | Applies to | Source |
|---|---|---|
| `tipo` | all | `identity` (with `subtipo` names / phones / addresses / mixed), `bureau-dispute`, `debt-validation` |
| `fecha` | all | One `Date` instance formatted twice |
| `remitente` | all | `givenNames`, `firstSurname`, `secondSurname`, `street`, `city`, `state`, `postalCode`, `currentPhone` |
| `buro` | identity, bureau-dispute | `{ nombre, destinatario, direccion[] }` (already English; same in both columns) |
| `valoresDisputados[]` | identity | `{ type, value }` — `type` Spanish label → mapped, `value` verbatim from the report |
| `motivo` | bureau-dispute | Key: `not-mine`, `wrong-amount`, `wrong-date`, `already-resolved`, `wrong-status`, `other` |
| `detalle` | bureau-dispute | **Free text** typed by the person (may be empty) |
| `hallazgo` | bureau-dispute, debt-validation | `{ clave, arg }` — stable key (`bankruptcy`, `foreclosure`, `repossession`, `charge-off`, `collection`, `late-payments`, `past-due-amount`, `inquiries`) and optional amount/count |
| `cobrador` | debt-validation | `{ nombre, calle, ciudad, estado, cp }` |
| `referencia` | debt-validation | Account reference typed by the person (optional) |

### Letter block (`bloque`)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable identifier (e.g. `remitente`, `asunto`, `cuerpo-1`, `firma`) — used by tests to align blocks |
| `es` | string[] | Spanish lines |
| `en` | string[] | English lines |
| `libre` | boolean | `true` if the block includes free text typed by the person |

**Invariants** (all asserted by tests)

1. `bloques.length` is identical for both languages by construction (one list); no block has an empty `es` or `en`.
2. Every fact in `datos` reaches both languages through the same insertion; a fact absent from one column is a test failure.
3. Text from the person or from the report is inserted verbatim; only generated wording differs by language.
4. `textoEn` = English blocks joined with blank lines exactly as a letter; it contains no labels, no notes, no Spanish generated wording.

### Letter result (`resultado`)

| Field | Notes |
|---|---|
| `bloques[]` | For rendering the two columns |
| `textoEs` | Spanish plain text (for reading / tests) |
| `textoEn` | English plain text — the **only** text the primary copy button uses |
| `hayTextoLibre` | Drives the "review this line in English" note |

## 3. Finding key (analyzer)

| Field | Notes |
|---|---|
| `clave` | Stable key; set where the analyzer creates a finding that has a letter |
| `titulo` (Spanish) | Unchanged; used in the UI only |
| Rendering | Form element carries `data-issue-key` (+ `data-issue-arg`) next to the existing `data-issue-title` |
| Fallback | Unknown key → generic English phrase; the Spanish title is never written into the English column |

## State transitions

- **Address block**: `sin cablear` → (focus in the marked field) → `cableado, activo` → (service failure) → `apagado para esta visita`; typing by hand always works in every state.
- **Letter**: `sin borrador` → (submit letter form) → `borrador mostrado (es + en)` → (submit again) → both columns replaced together. Changing form fields alone does not alter an existing draft (unchanged behavior).
