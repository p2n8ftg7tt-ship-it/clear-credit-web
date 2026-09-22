# Contract: Address form markup and browser API

**Provider**: `direccion-autocompletar.js`. **Consumers**: `credito.html`, `herramientas.html`, `cuenta.html`, `listar-negocio.html`.

## Markup

A block is a group of fields marked with `data-dir-*` attributes. Only fields carrying `data-dir-calle` ever send text.

| Attribute | On | Meaning |
|---|---|---|
| `data-dir-calle="<grupo>"` | the street / single-address input | Marks a block and names it (`<grupo>` is any token unique **within the form**, e.g. `persona`, `cobrador`, `negocio`) |
| `data-dir-ciudad="<grupo>"` | city input | Optional |
| `data-dir-estado="<grupo>"` | state input | Optional (`separado`) |
| `data-dir-cp="<grupo>"` | ZIP input | Optional (`separado`) |
| `data-dir-estado-cp="<grupo>"` | merged state + ZIP input | Optional (`estado-cp`) |
| `data-dir-tipo="persona\|cobrador\|negocio"` | the `data-dir-calle` input | Notice wording (default `persona`) |

**Shape is inferred** from which sibling attributes exist for the group: any `estado-cp` → `estado-cp`; else any of `ciudad` / `estado` / `cp` → `separado` (absent fields are skipped); none → `unico`.

**Scope of lookup**: siblings are searched inside the closest `form`, or, if there is no form, inside the closest ancestor that contains the street input and a container marked `data-dir-scope` (used by the account page if its fields are outside a `<form>`).

**Rules**

1. Marking the fields is the only per-page step besides loading the script. No per-page JavaScript call is required.
2. A field without `data-dir-calle` never sends text (the collector's name, phone, etc. are never marked).
3. Marked inputs keep their own `name`, `id`, `required`, `maxlength`, validation and submission behavior; the script only sets `autocomplete="off"`, `role="combobox"` and ARIA attributes on the street input when active, and restores the original `autocomplete` value when it turns itself off.

## Fixed marking per form

| Form | Street field | Group / type | Other fields |
|---|---|---|---|
| F1 credito — person (3 letter forms) | `name="street"` | `persona` / `persona` | city, state, ZIP |
| F2 credito — collector (debt validation) | `name="collectorStreet"` | `cobrador` / `cobrador` | city, state, ZIP |
| F3 herramientas — person | `#cdStreet` | `persona` / `persona` | city, state, ZIP |
| F4 herramientas — collector | `#cdCollectorStreet` | `cobrador` / `cobrador` | city, state, ZIP |
| F5 cuenta — profile | `#profileAddress` | `persona` / `persona` | `#profileCity`, `#profileState` as `estado-cp` |
| F6 listar-negocio | `#lnDireccion` | `negocio` / `negocio` | none (`unico`) |

The legacy `ThemoraDireccion.conectar(form, { campos })` keeps working for `separado` forms so existing behavior is not broken during the change; the credito glue (`results.addEventListener('focusin', …)`) is removed in favor of the attributes.

## Browser API (`window.ThemoraDireccion`)

| Member | Behavior |
|---|---|
| `conectar(form, opciones?)` | Legacy entry point; wires one `separado` block by field names. Idempotent per street input |
| `conectarBloque(calleInput)` | Wires the block that the given marked input starts. Idempotent. Used by the delegated `focusin` listener |
| `__prueba.valoresParaBloque(direccion, forma)` | Pure composing function (see [data-model.md](../data-model.md)) — Node tests only |

The script registers **one** `focusin` listener on `document` at load; it wires the block on the first focus inside a marked street field. Wiring performs no network request.

## Behavior guarantees (tested or verified in the quickstart)

- No request before the person types ≥ 4 characters in a marked street field (page load, focus, typing in other fields: none).
- Choosing a suggestion fills only that block's fields, fires `input` and `change` events on each filled field (so existing validation/save logic sees the values), and leaves every field editable.
- After 404 / 403 / 405 / `noConfigurado` / `noDisponible` / 5xx the block turns off for the visit, restores `autocomplete`, shows the note, and sends nothing more.
- 429 shows the "too many searches" note; typing by hand still works.
- Notice (`.tda-optin`) sits directly above the street field; list and status live in the same container; keyboard: ↑ ↓ Enter Esc Tab; status text is `aria-live="polite"`.
- Analytics: only `autocompletar-direccion-usado`; never the address.

## Coverage test contract (`tests/formularios-direccion.test.js`)

For each root `*.html`:

1. Find field definitions whose `id` or `name` matches `/street|calle|direccion|address/i` (case-insensitive) — including ones inside JS template strings.
2. Each must carry `data-dir-calle` **or** be in the test's allowlist, where every entry states a reason. Initial allowlist: the hidden static Netlify form fields in `listar-negocio.html` (server-side form detection copy, not user-visible) and admin-only fields, if any are found.
3. Every page that contains `data-dir-calle` must include `<script src="direccion-autocompletar.js">`.
4. `data-dir-tipo="cobrador"` blocks must not share a group token with a `persona` block in the same form.
