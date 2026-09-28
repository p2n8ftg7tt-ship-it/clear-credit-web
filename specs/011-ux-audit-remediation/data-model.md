# Data Model: UX Audit Remediation

This feature has no database changes. Its "entities" are configuration values and design tokens.

## Legal identity (`empresa.js`, owner-filled)

| Field | Type | Rule |
|---|---|---|
| RAZON_SOCIAL | string | Exact registered name. If empty, the `operador` slot stays hidden. |
| ESTADO | string | Only shown if present. |
| NUMERO_REGISTRO | string | Only shown with ESTADO. |
| DIRECCION | string | Registered agent or business mailbox, not a home address. |
| CORREO_LEGAL | string | Rendered as a `mailto:` link in the full block. |

Slot modes (`data-empresa="…"`):

| Mode | Output | Used in |
|---|---|---|
| `corta` (exists) | RAZON_SOCIAL · DIRECCION | footer |
| full (exists, any other value) | name, registration, address, email | Términos, Privacidad |
| `operador` (**new**) | "Operado por RAZON_SOCIAL, ESTADO" | next to every `.pago-caja` and in the Términos price section |

State: `hayAlgo=false` → every slot `hidden`. `operador` additionally requires `RAZON_SOCIAL`.

## Contact channels (`whatsapp.js`, owner-filled)

WHATSAPP_NUMERO, TELEFONO, TELEFONO_MARCAR: unchanged behavior (render only if set).

## Design tokens (`styles.css :root`)

| Token | Before | After | Reason |
|---|---|---|---|
| `--radius` | 16px | 6px | Shape rule (FR-013) |
| `--radius-sm` | 10px | 4px | Shape rule |
| `--radius-lg` / `-xl` / `-2xl` | 28 / 40 / 56px | 6px | Shape rule |
| `--radius-pill` | 999px | unchanged | chips/tags only |
| `--borde-campo` | none | `#6E8890` (**new**) | input borders ≥3:1 (FR-007) |
| `--focus-color` | `--accion` everywhere | `--agua` inside dark contexts | FR-005 |
| `--gold` alias | `--franja-celeste` | unchanged value; no longer used as text or avatar fill | FR-008/014 |

Existing token names are not renamed (renaming is deferred; see plan's Complexity Tracking).
