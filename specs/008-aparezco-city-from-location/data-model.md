# Data Model: "¿Aparezco?" fills in my city from my location

Nothing is stored. These are in-memory shapes only.

## GeoRespuesta (function → page)

| Field | Type | Rule |
|-------|------|------|
| `ciudad` | string \| null | Present only when the request's country is US and both city and subdivision code exist. |
| `estado` | string \| null | Two-letter US code taken from `subdivision.code` (e.g. `TX`). |

Never contains latitude, longitude, postal code, timezone, IP or country name.

## CiudadSugerida (page state)

| Field | Type | Rule |
|-------|------|------|
| `texto` | string | `"Ciudad, ST"` — city trimmed, state uppercased; state ∈ 50 states + DC. |
| `origen` | `"perfil"` \| `"detectada"` | `perfil` wins when a signed-in profile has a valid city + state. |
| `aplicada` | boolean | True once written into the field. |

## EstadoCampoCiudad (per visit)

| Field | Type | Rule |
|-------|------|------|
| `tocado` | boolean | Set on the first `input` event by the visitor; after that, no suggestion is ever applied. |
| `valorSugerido` | string \| null | What was applied, to classify the analytics value. |

### Analytics classification at search time

| Condition | `ciudad` value |
|-----------|----------------|
| field empty | `vacia` (search blocked; event not sent) |
| field equals applied suggestion from profile | `perfil` |
| field equals applied suggestion from detection | `detectada` |
| a suggestion was applied and the field now differs | `editada` |
| no suggestion was applied | `escrita` |

## Profile parsing (`city`, `state_zip` from user metadata)

- `state_zip` first token, if two letters and a valid code → that code.
- Otherwise, leading full state name (Spanish or English, accents ignored, e.g. "Virginia", "Nuevo México", "New Mexico") → code.
- Missing city or unparseable state → no profile suggestion.
