# Quickstart: prove the feature works end to end

Order matters: automated checks first (no network, no cost), then the owner's publish and one-command check, then the browser pass on the live site.

## 0. Prerequisites

- Node 18+ (`node --version`).
- Netlify CLI installed and logged in (`netlify --version`) — needed only for publishing and for `netlify dev`.
- Google side (owner, once): key in `GOOGLE_PLACES_API_KEY`, "Places API (New)" enabled, billing on, **daily quota set** (see `INSTRUCCIONES-DIRECCIONES.md`).

## 1. Automated checks (must all pass before publishing — gate G-TESTS)

```bash
node --test tests/*.test.js     # Node 22+ does not expand a bare `tests/` directory
```

Expected: all existing suites still pass (address function: 20 tests; Zyron laws) **plus** the new ones:

| Suite | Proves |
|---|---|
| `autocompletar-direccion.test.js` | `estado` answers without calling Google and never leaks the key |
| `direccion-formas.test.js` | separate / merged state+ZIP / single-field composing, no dangling commas |
| `formularios-direccion.test.js` | every address-looking field in the site is wired or allowlisted; pages load the script |
| `cartas-bilingues.test.js` | same facts and citations in Spanish and English; no Spanish leakage; honesty words; English copy is pure |

A failing test is reported as is; tests are not weakened to pass.

## 2. Hygiene checks (gates G-BLOCK and G-PRIV)

```bash
git diff --stat                     # no whole-file diffs (line endings must stay LF)
grep -n "specs\|\.specify\|graphify-out\|CLAUDE.md\|INSTRUCCIONES-PAGOS\|INSTRUCCIONES-DIRECCIONES\|INSTRUCCIONES-CARTAS" netlify.toml
grep -n "cobrador\|negocio\|perfil" privacidad.html | head   # the privacy text names every form that sends street text
```

Expected: `netlify.toml` blocks each internal path; `privacidad.html` lists credit letters, collector-contact letter, account profile, business listing, and the third-party table row is updated.

## 3. Publish and one-command service check (owner)

```bash
netlify deploy --prod
curl -s -X POST -H "Origin: https://mithemora.com" -H "Content-Type: application/json" \
  -d '{"accion":"estado"}' https://mithemora.com/.netlify/functions/autocompletar-direccion
```

Expected: `{"vivo":true,"configurado":true}`. Interpretations for 404 / 403 / `configurado:false` are in [contracts/address-service.md](./contracts/address-service.md).
Also check a blocked path answers as blocked: `curl -sI https://mithemora.com/specs/003-address-autocomplete-bilingual-letters/spec.md` should not return the file.

## 4. Browser pass on the live site (clean session, DevTools → Network open)

Address suggestions (Part A). For **each** form, on desktop and on a phone-width window:

| # | Form | Do | Expect |
|---|---|---|---|
| A1 | Credito → analyze a report → any letter form → "Calle y número" | Load page, focus the field, type in "Nombre" | **No** request to `autocompletar-direccion` |
| A2 | same | Type `1600 Penn` in the street field | Suggestions in ≤ 2 s; pick one → street, city, state, ZIP filled and editable |
| A3 | Credito → debt-validation letter → collector street | Type a collector address, pick one | Only the collector block fills; the person's block is untouched |
| A4 | Herramientas → cese de comunicación → person street, then collector street | Same as A2, A3 | Same |
| A5 | Cuenta (signed in) → profile → "Dirección" | Pick a suggestion | Address, city, and "Estado y código postal" = `VA 24016`-style |
| A6 | Listar negocio → "Dirección completa del negocio" | Pick a suggestion | The single field = `street, city, ST ZIP` |
| A7 | Any form, DevTools → block `autocompletar-direccion` | Type in the street field | One short note, no repeated requests; you can finish and submit by hand |
| A8 | Any form, keyboard only | ↑ ↓ Enter Esc | Works; status read by screen reader |

Bilingual letters (Part B). On the credit analyzer, for each letter type (identity correction, bureau dispute, debt validation):

| # | Do | Expect |
|---|---|---|
| B1 | Fill the form, submit | Two labeled columns, Spanish left "Para que la entiendas — español", English right "Para enviar — English"; paragraphs align |
| B2 | Compare the columns | Same names, address, phone, date (same day), recipient, disputed items/reason, legal citations |
| B3 | Press "Copiar carta en inglés", paste into a text editor | Only the English letter; no labels, no Spanish |
| B4 | Bureau dispute with "Detalle adicional" in Spanish | Text identical in both columns; note about reviewing it in English appears; without detail: no note |
| B5 | Window at 360 px | Columns stack (Spanish, then English), no horizontal scroll |
| B6 | Print preview | Only the English letter is printed |
| B7 | Network tab while doing B1–B4 | No request carrying letter content; only the address-suggestion calls from Part A |
| B8 | Submit again after changing a field | Both columns refresh together |

## 5. Wrap-up

```bash
graphify update .
```

Then the owner arranges the native-level English review (checklist in `INSTRUCCIONES-CARTAS-BILINGUES.md`); until it is done the page keeps the "review before sending" note and makes no claim of professional review.
