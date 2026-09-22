# Contract: Bilingual letter module and result markup

**Provider**: `cartas-bilingues.js` (browser global `ThemoraCartas`; `module.exports` under Node). **Consumer**: the letter forms in `credito.html`. No network access, no storage, no AI.

## API

### `ThemoraCartas.armar(tipo, datos) → resultado`

- `tipo`: `identity` | `bureau-dispute` | `debt-validation`.
- `datos`: as in [data-model.md](../data-model.md) §2 (one `Date` for `fecha`).
- `resultado`: `{ bloques: [{ id, es: string[], en: string[], libre: boolean }], textoEs, textoEn, hayTextoLibre }`.
- Throws nothing on missing optional fields; required-field validation stays where it is today (form validation in `credito.html`).

### Other members (also exported for tests)

| Member | Purpose |
|---|---|
| `ETIQUETAS_HALLAZGO` | Map of finding key → `{ es, en }` labels |
| `ETIQUETAS_TIPO_DATO` | `Nombre` / `Nombre o alias` / `Teléfono` / `Dirección` → English |
| `MOTIVOS` | Dispute reason key → `{ es, en }` sentences |
| `formatearFecha(fecha, 'es'\|'en')` | `Intl` wrapper; same calendar day |

## Letter structure (identical block ids in both languages)

| Type | Blocks in order |
|---|---|
| `identity` | `remitente` · `fecha` · `destinatario` · `asunto` · `saludo` · `apertura` · `disputados` · `correcta` · `adjuntos` · `declaracion` · `firma` |
| `bureau-dispute` | `remitente` · `fecha` · `destinatario` · `asunto` · `saludo` · `apertura` · `motivo` (when the person typed «Detalle adicional» it is the block's second line, and the block gets `libre:true`) · `fcra-investigacion` · `fcra-notificacion` · `mi-informacion` · `adjuntos` · `declaracion` · `firma` |
| `debt-validation` | `remitente` · `fecha` · `cobrador` · `asunto` · `saludo` · `apertura` · `lista-validacion` · `no-reconocimiento` · `mi-informacion` · `firma` |

Legal content per block is the same request the Spanish letters make today (FCRA § 611 / 15 U.S.C. § 1681i incl. § 611(d), 30 days, 5 business days; FDCPA 15 U.S.C. § 1692g). Spanish wording is preserved; English is its equivalent.

## Result markup (inside each `.cr-solution-result`)

```
.cr-solution-result
  strong                         "Borrador de …" (existing wording kept)
  .cr-letter-pair[role=group][aria-label="Carta en español y en inglés"]
    .cr-letter-head.es           "Para que la entiendas — español"
    .cr-letter-head.en           "Para enviar — English"
    .cr-letter-row (display: contents)        ← one per block
      .cr-letter-cell.es[lang=es]   <p> lines
      .cr-letter-cell.en[lang=en]   <p> lines
  p.cr-letter-note[hidden?]      free-text note (only when hayTextoLibre)
  p.cr-letter-disclaimer         educational disclaimer + "el inglés es un borrador que tú revisas"
  textarea.cr-solution-letter    readonly, visually hidden, lang=en, aria-label="Carta en inglés para enviar", value = textoEn
  button.cr-copy-solution        "Copiar carta en inglés"
```

### Layout rules

- Desktop (≥ 720 px): two equal tracks; rows aligned block by block.
- Phone (< 720 px): one track; order = Spanish head → all Spanish cells → English head → all English cells (CSS `order`, no duplicated DOM).
- No horizontal scroll at 360 px; long addresses wrap (`overflow-wrap: anywhere`).
- `@media print`: `.cr-letter-cell.es` and `.cr-letter-head.es` hidden.
- Tokens: existing light "galería blanca" variables of `credito.html`; no changes to `styles.css`.

### Behavior rules

1. Submit of a letter form builds `datos` from the form, calls `armar`, renders **both** columns from the same result, sets the hidden textarea to `textoEn`, and shows the result. Re-submit replaces both together.
2. Primary button copies `textoEn` only (clipboard API, else select + `execCommand`); labels: idle "Copiar carta en inglés", success "Carta en inglés copiada", failure "Selecciona y copia el texto" (textarea becomes visible and selected).
3. Free-text note text: "La línea «Detalle adicional» está en tus propias palabras. Revísala o escríbela en inglés antes de enviar." Shown only when `hayTextoLibre`.
4. Analytics: `ThemoraStats.evento('carta-generada', { tipo })` and `'carta-ingles-copiada'` — never content.
5. Nothing is sent to the network by this feature.

## Tests (`tests/cartas-bilingues.test.js`)

See research R20: block parity, fact parity, citation parity, no Spanish leakage in English, honesty words, free-text trigger, copy purity, unknown finding key fallback, identical calendar day.
