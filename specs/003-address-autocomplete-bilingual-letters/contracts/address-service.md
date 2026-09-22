# Contract: Address suggestion service

**Endpoint**: `POST /.netlify/functions/autocompletar-direccion` (existing; one action added)
**Consumers**: `direccion-autocompletar.js` (all six address forms) and the owner's check.
**Unchanged rules**: POST only (else 405); same-site `Origin`/`Referer` required (else 403); JSON body; `Cache-Control: no-store`; the key never appears in any response; typed text is never logged; social-security-like and card-like text is rejected; limits 60 queries / 10 min per IP and 30 per address session (per instance).

## Existing actions (unchanged)

| Request | Success | Failure responses |
|---|---|---|
| `{ accion: "sugerir", texto, sesion }` — `texto` 4–100 chars | `200 { sugerencias: [{ id, principal, secundario }] }` (≤ 5) | `400` invalid session / sensitive text; `429 { limitado }`; `502 { noDisponible }`; `503 { noConfigurado }` |
| `{ accion: "detalle", id, sesion }` | `200 { direccion: { calle, ciudad, estado, cp, completa } }` | same as above |

`sesion`: 16–80 chars `[A-Za-z0-9_-]`, created by the browser per typed address.

## New action: `estado` (no Google call, no cost)

**Request**: `{ "accion": "estado" }` — needs no `sesion`.

**Order of checks**: method → origin → parse body → **if `accion === "estado"`: answer here** → key check → session check → rate limits → Google actions.
(The key check must not short-circuit `estado`; that is how "configured or not" becomes observable.)

**Response**: `200 { "vivo": true, "configurado": true | false }`, `no-store`.

- Never includes the key, its length, its prefix, or any environment value.
- Counts against the per-IP limit like other requests.

### How the owner reads the result

| Observed | Meaning | Fix |
|---|---|---|
| `404` (HTML "not found") | Function not published | Publish with the Netlify CLI, confirm the function appears in the deploy's Functions list |
| `403` | Sent without a same-site `Origin` header (or wrong host) | Repeat with `-H "Origin: https://mithemora.com"` |
| `405` | Wrong method (GET) | Use POST |
| `200 { vivo:true, configurado:false }` | Published, no Google key in the environment | Set `GOOGLE_PLACES_API_KEY` in Netlify → redeploy |
| `200 { vivo:true, configurado:true }` | Published and configured. Whether Google itself accepts the key (Places API (New) enabled, billing, restrictions) is only proven by a real search on a form | Run the browser check in the quickstart |

## Tests (added to `tests/autocompletar-direccion.test.js`)

- `estado` returns `vivo:true, configurado:false` and makes **no** outbound call when the key is missing.
- `estado` returns `configurado:true` when the key exists, makes no outbound call, and the response body does not contain the key.
- `estado` from a foreign origin → 403; via GET → 405.
- Existing actions keep their previous responses (all current 20 tests still pass unchanged).
