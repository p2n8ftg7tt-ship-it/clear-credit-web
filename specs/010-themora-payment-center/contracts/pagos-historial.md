# Contract: Customer payment history

**Endpoint**: `POST /.netlify/functions/pagos-historial` (new)
**Consumers**: `cuenta.html` (new "Pagos" tab) — User Story 2.
**Auth**: requires a valid Supabase session; returns only that session's own rows
(FR-013 — never another customer's data). RLS on `pagos`/`suscripciones`/`reembolsos`
enforces this even if the function had a bug, as defense in depth.

## Request

```json
{ "accessToken": "..." }
```

(Same shape as `crear-factura.js`'s auth check — token in body, verified server-side
against Supabase, matching this codebase's existing convention rather than a bearer
header, so it's consistent with the other functions a reviewer already knows.)

## Responses

| Case | Response |
|---|---|
| Success, has history | `200 { "pagos": [{ id, servicio, montoCentavos, estado, creadoEn, facturaUrl }], "suscripcion": { estado, plan } \| null }` |
| Success, no history yet | `200 { "pagos": [], "suscripcion": null }` (FR: honest empty state, not an error) |
| No/invalid session | `401 { "error": "..." }` |
| Method not POST | `405` |

`facturaUrl` is Stripe's own hosted invoice URL (never re-rendered by Themora — R-style
reuse of Stripe as the document of record, consistent with `crear-factura.js`'s
`panel` link pattern).

## Tests (`tests/pagos-historial.test.js`)

- Returns only rows where `user_id` matches the authenticated session.
- A failed payment appears with `estado: "fallido"`, not hidden (FR-012).
- A customer with zero payments gets `{ pagos: [], suscripcion: null }`, not a 4xx.
- No session → 401, no data of any kind leaked in the error body.
