# Data Model: Credit Page Fixes

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Nothing here is stored. These are the in-memory shapes passed between `credito.html` and `cartas-bilingues.js`. Changes from spec 003 are marked **NEW** or **CHANGED**.

## 1. Phone number

| Field | Type | Rule |
|---|---|---|
| raw | string | whatever the person typed, pasted, or the browser autofilled |
| digits | string | `raw` without non-digits; if it has exactly 11 digits and the first is `1`, that `1` is dropped; at most 10 kept |
| typing form | string | `telefonoEscribiendo(raw)`: progressive `XXX`, `XXX-X…`, `XXX-XXX`, `XXX-XXX-X…`, `XXX-XXX-XXXX` |
| output form | string | `formatearTelefono(raw)`: `XXX-XXX-XXXX` when `digits.length === 10`; otherwise `raw` trimmed, unchanged |
| valid | boolean | `digits.length === 10` |

Examples: `5405550142` → `540-555-0142` · `(540) 555-0142` → `540-555-0142` · `+1 540.555.0142` → `540-555-0142` · `54055` → typing `540-55`, output `54055` (not valid).

## 2. Sender (`remitente`) — CHANGED

Built by `remitente(datos)` in `cartas-bilingues.js` from the form's `readPersonalInfo()`.

| Field | Source | Change |
|---|---|---|
| `givenNames`, `firstSurname`, `secondSurname` | form | unchanged |
| `legalName` | joined non-empty name parts | unchanged |
| `street`, `city`, `state`, `postalCode` | form, whitespace collapsed by `limpio()` | **NEW**: collapsed |
| `address` | `[street, city, (state + ' ' + postalCode).trim()]` filtered for empties, joined with `, ` | **CHANGED**: no doubled commas or spaces |
| `phone` | `formatearTelefono(currentPhone)` | **CHANGED**: hyphenated |

`street`, `city`, `state`, `postalCode` remain on the object for the tests and for the Google Maps button, but are **no longer printed** as separate lines in any letter.

## 3. Detected personal value

```
{ type: 'Nombre' | 'Nombre o alias' | 'Dirección' | 'Teléfono', value: string }
```

- Produced by the analyzer from the report's personal block (unchanged extraction).
- `value` for phones is now the hyphenated form (**CHANGED**, was `(540) 555-0000`).
- Stored in each checkbox's `value` as JSON (unchanged) and read back by `submitIdentityCorrection` as `valoresDisputados`.
- Uniqueness key inside a type: names and addresses → lower-case with collapsed spaces; phones → digits.

## 4. Identity group — NEW

Returned by `agruparDetectados(valores)`.

```
[ { clave: 'nombres',     titulo: 'Nombres',     valores: [detected value, …] },
  { clave: 'direcciones', titulo: 'Direcciones', valores: [ … ] },
  { clave: 'telefonos',   titulo: 'Teléfonos',   valores: [ … ] } ]
```

- Always in this order; a group with no values is omitted.
- Values keep the order in which they were first detected.
- The page shows `titulo + ' (' + valores.length + ')'` in the legend.
- Type → group: `Nombre` and `Nombre o alias` → `nombres`; `Dirección` → `direcciones`; `Teléfono` → `telefonos`; anything else is placed last in a group `otros` titled «Otros datos» (so nothing is dropped).

## 5. Identity card decision — NEW

`tiposDeTarjeta({ nombres, direcciones, telefonos })` takes counts and returns the subtypes to offer, in the order the analyzer adds them:

| Condition | Subtype returned |
|---|---|
| `nombres ≥ 2` | `identity-names` |
| `telefonos ≥ 2` | `identity-phones` |
| `direcciones ≥ 2` | `identity-addresses` |
| all three `≥ 2` | `identity-mixed` |
| otherwise | none |

(Same thresholds as today; only the *list shown inside each card* changes: always all groups.)

## 6. Disputed values ordering — NEW

`ordenarDisputados(valores)`: stable sort by rank — names (0), addresses (1), phones (2), other (3). Ties keep their original order. Applied inside `cartaIdentidad()` when building block `disputados`, and phones are passed through `formatearTelefono`.

## 7. Identity letter block `correcta` — CHANGED

Lines, in both languages, in this order:

| # | Spanish | English |
|---|---|---|
| 1 | `MI INFORMACIÓN CORRECTA:` | `MY CORRECT INFORMATION:` |
| 2 | `Nombre legal: …` | `Legal name: …` |
| 3 | `Nombre(s): …` | `Given name(s): …` |
| 4 | `Primer apellido: …` | `First surname: …` |
| 5 | `Segundo apellido: … / No aplica` | `Second surname: … / N/A` |
| 6 | `Dirección actual: <one line>` | `Current address: <one line>` |
| 7 | `Teléfono actual: XXX-XXX-XXXX` | `Current phone: XXX-XXX-XXXX` |

**Removed** (both languages): `Calle y número`, `Ciudad`, `Estado`, `Código postal` / `Street and number`, `City`, `State`, `ZIP code`. Block count per letter type is unchanged (11 / 13 / 10 blocks).

## 8. State changes

None persist. Ticking boxes and the «Marcar todos» toggle change only the checked state of checkboxes in the open form; the letter is generated from the checked boxes when the person presses «Preparar solicitud de corrección».
