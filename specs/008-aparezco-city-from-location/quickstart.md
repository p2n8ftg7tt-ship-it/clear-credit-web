# Quickstart: validate "¿Aparezco?" city from location

## Prerequisites

- Node 18+ (for `node --test`).
- Optional: Netlify CLI (`netlify dev`) for the function; production deploy for real geo data.

## 1. Unit tests (rules)

```bash
node --test tests/ciudad-sugerida.test.js
```

Expected: pass. Covers formatting, 50 states + DC, rejection of non-US/state-only, profile parsing (`"VA 24011"`, `"Virginia"`, `"Nuevo México"`), and analytics classification.

## 2. Function contract

```bash
node --test tests/ubicacion-funcion.test.js
```

Expected: pass. Calls the function with a fake `context.geo` for: US city (→ `{ciudad, estado}`), Canada (→ nulls), missing city (→ nulls), missing geo (→ nulls); checks `Cache-Control: private, no-store` and that no extra fields are returned.

## 3. On the deployed site (deploy preview)

1. Open `/aparezco.html` in a private window. Within ~2 s the city field shows your city as "Ciudad, ST" with the "Detectamos tu ciudad…" note.
2. Type in the field before it fills (throttle the network to "Slow 3G"): your text is never replaced.
3. Tap "×": the field empties and gets focus. Press "Buscar mi negocio": the city message appears; no request is sent (check the Network tab).
4. Type another city and search: the result says "Buscamos en: <that city>".
5. Sign in with a profile that has city + state saved: the field uses the profile city with the profile note.
6. Response of `/.netlify/functions/ubicacion` in the Network tab: only `ciudad` and `estado`; `Cache-Control: private, no-store`.

## 4. Failure path

Block `/.netlify/functions/ubicacion` in DevTools (Request blocking) and reload: the page looks exactly as before this feature.
