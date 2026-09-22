# Contract: `ThemoraCartas` additions and changed letter output

**Provider**: `cartas-bilingues.js` (browser global `ThemoraCartas`; `module.exports` under Node). **Consumer**: `credito.html`. Builds on [spec 003's contract](../../003-address-autocomplete-bilingual-letters/contracts/bilingual-letter.md); only the differences are listed. No network, no storage, no AI.

## New exports

| Member | Signature | Behavior | Spec |
|---|---|---|---|
| `telefonoEscribiendo` | `(valor: any) → string` | Digits only; drop one leading `1` when 11 digits; cap 10; progressive hyphens. `''` for empty/`null`. | AC-1.1–1.4, 1.8 |
| `formatearTelefono` | `(valor: any) → string` | `XXX-XXX-XXXX` if 10 digits (after the same rule), else the trimmed input unchanged. | AC-1.6, 1.7, 1.9 |
| `telefonoValido` | `(valor: any) → boolean` | `true` iff exactly 10 digits after the rule. | AC-1.5 |
| `agruparDetectados` | `(valores: Detected[]) → Group[]` | De-duplicate, group `nombres → direcciones → telefonos → otros`, drop empty groups, phones hyphenated. | AC-3.1, 3.2, 3.5 |
| `tiposDeTarjeta` | `({nombres, direcciones, telefonos}: number counts) → string[]` | Subtypes to offer (see data model §5). | AC-3.3, 3.4 |
| `ordenarDisputados` | `(valores: Detected[]) → Detected[]` | Stable sort names → addresses → phones → other. Does not mutate the input. | AC-3.9 |

`Detected` and `Group` are defined in [data-model.md](../data-model.md) §3–4.

## Unchanged exports

`armar`, `formatearFecha`, `ETIQUETAS_HALLAZGO`, `ETIQUETAS_TIPO_DATO`, `MOTIVOS`. `armar(tipo, datos)` keeps its signature and its result shape `{ bloques, textoEs, textoEn, hayTextoLibre }`.

## Changed letter output

### All three letters

- Every phone printed by the module (`remitente` block, `Teléfono actual / Current phone`, `MI INFORMACIÓN / MY INFORMATION`) is `formatearTelefono(currentPhone)`.
- `remitente().address` is `street, city, state ZIP` with single spaces, no empty parts, no doubled commas.

### Identity letter only (`armar('identity' | 'identity-*', …)`)

- Block `disputados`: lines are `ordenarDisputados(valoresDisputados)`, one `- <tipo>: <valor>` line per value; phone values pass through `formatearTelefono`. One line per ticked value, none added, none dropped.
- Block `correcta`: exactly the 7 lines in [data-model.md §7](../data-model.md); the four split-address lines are gone in both languages.
- Block ids and their order are unchanged: `remitente · fecha · destinatario · asunto · saludo · apertura · disputados · correcta · adjuntos · declaracion · firma`.

### Bureau-dispute and debt-validation letters

- Unchanged except the phone format above. Block ids, order and legal text identical to spec 003.

## Invariants the tests enforce

1. Same block ids, same order, same **number of lines per block** in `es` and `en` (AC-2.7).
2. Every phone in the text matches `\d{3}-\d{3}-\d{4}` when the input had 10 digits (SC-001).
3. The street text appears at most twice per language in the identity letter; none of the removed labels appear (SC-002).
4. The English column contains none of the Spanish words already forbidden by the existing test, and no «es ilegal / debes / garantizo» in either language (Constitution I).
5. `agruparDetectados` never returns fewer values than the number of distinct values it was given (SC-003).

## Markup contract for the detected list (`credito.html`)

```
form.cr-solution-form
  fieldset.cr-detected-data                    (one wrapper, legend "Datos personales detectados")
    span.cr-detected-help                      (existing help text)
    fieldset.cr-detected-group[data-group=nombres|direcciones|telefonos|otros]
      legend                                   "Nombres (3)"  |  "Direcciones (2)"  |  "Teléfonos (3)"
      button.cr-detected-toggle[type=button]   "Marcar todos" ⇄ "Quitar todos"   (only when the group has ≥ 2 values)
      label.cr-detected-option
        input[type=checkbox][name=disputedValue][value=<JSON of Detected>]
        span > b "<tipo>:" + " <valor>"       (text, escaped)
```

- Nothing is checked initially.
- The toggle changes only the boxes inside its own `fieldset.cr-detected-group`; its label and `aria-pressed` reflect whether all boxes in the group are checked.
- Values are escaped as text (`escapeHtml`); the JSON in `value` keeps today's shape `{type, value}`.
- Phone field markup: `<input name="currentPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="540-555-0142" pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}" title="Escribe un teléfono de 10 dígitos, como 540-555-0142." required>`.
