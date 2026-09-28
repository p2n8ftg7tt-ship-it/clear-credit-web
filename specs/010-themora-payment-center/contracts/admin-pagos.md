# Contract: Admin payment operations

**Endpoint**: `POST /.netlify/functions/admin-pagos` (new)
**Consumers**: `admin.html` — new "Pagos" panel section (User Story 4), alongside the
existing, untouched `facturas()` manual-invoice panel.
**Auth**: `esAdmin(accessToken)` — identical check to `crear-factura.js`/
`admin-data.js` (`app_metadata.is_admin`), no separate finance role (FR-018, R7).

## Request

A single `accion` field selects the operation, matching the existing `admin-data.js`/
`autocompletar-direccion.js` convention of one endpoint with an `accion` dispatcher
rather than one function per action.

```json
{ "accessToken": "...", "accion": "buscar", "consulta": "cliente@correo.com" }
```

| `accion` | Extra fields | Purpose |
|---|---|---|
| `aprobarPago` | `correo`, `servicio`, `referencia`, `tasasCentavos?`, `tasasConcepto?` | User Story 1 — staff have already confirmed eligibility/price in writing via the existing `listar-negocio.html`/`formar-negocio.html` quote flow; this is what makes that specific `(customer, servicio, referencia)` payable through self-checkout (data-model.md "Approval precondition"). It does **not** create a Stripe invoice — it only unlocks `pagos-crear-sesion.js` for that one approved item. |
| `buscar` | `consulta` (email or `TH-…` reference) | User Story 4, FR-014 |
| `reembolsar` | `pagoId`, `montoCentavos`, `motivo` | User Story 4, FR-015 |
| `eventosWebhook` | `desde`/`hasta` (optional date range) | FR-016 |
| `disputas` | — (lists open disputes) | FR-017 |
| `auditoria` | `pagoId` (optional filter) | FR-022, for staff review |

## Behavior — `aprobarPago`

1. Verify admin → 403 if not.
2. Validate `servicio` against the shared catalog (400 if unknown), `referencia`
   against `^TH-\d{6}-[A-Z2-9]{4}$` (400 if malformed), `tasasCentavos` against the
   same cap `crear-factura.js` already enforces (400 if over cap or missing
   `tasasConcepto` when `tasasCentavos > 0`).
3. Resolve `correo` to a Supabase `user_id` (Supabase Admin API lookup by email,
   service-role key — the same identity source `crear-factura.js` treats as
   authoritative for "who is this customer").
4. Insert a `pagos` row: `estado = 'aprobado'`, `monto_centavos` from the catalog,
   `tasas_centavos`/`tasas_concepto` if provided. Reject with 409 if a row for this
   exact `(user_id, servicio, referencia)` already exists (no duplicate approvals).
5. Insert an `auditoria_pagos` row (`accion: "pago_aprobado"`) — this is itself an
   admin action that changes payment state, so it's audited like any other
   (FR-022).

## Behavior — `reembolsar`

1. Verify admin → 403 if not.
2. Load the `pagos` row → 404 if missing.
3. Compute `ya_reembolsado = sum(reembolsos.monto_centavos where pago_id = pagoId)`.
4. Reject with 400 if `montoCentavos > (pagos.monto_centavos - ya_reembolsado)`
   (FR-015, FR-026 — never over-refund).
5. Call Stripe's refund endpoint with an `Idempotency-Key` derived from
   `(pagoId, adminUserId, montoCentavos)` (R5) — a retried request never double-
   refunds.
6. Insert `reembolsos` row and an `auditoria_pagos` row (`accion:
   "reembolso_emitido"`) in the same operation (FR-022 — every admin money action is
   audited, no code path skips it).
7. The Stripe `charge.refunded` webhook later confirms/reconciles `pagos.estado`
   (US4 + US5 — the admin action and the webhook-driven truth are two different
   things on purpose).

## Responses

| Case | Response |
|---|---|
| `aprobarPago` success | `200 { "ok": true, "pagoId": "..." }` |
| `aprobarPago`, unknown correo | `404 { "error": "No encontramos una cuenta con ese correo." }` |
| `aprobarPago`, duplicate approval | `409 { "error": "Ya existe una aprobación para esa referencia." }` |
| `buscar` success | `200 { "cliente": {...}, "pagos": [...], "suscripciones": [...], "disputas": [...] }` |
| `buscar`, no match | `200 { "cliente": null }` (honest empty state, not a 404 — "no such customer" isn't an error) |
| `reembolsar` success | `200 { "ok": true, "reembolsoId": "re_..." }` |
| `reembolsar`, over-refund attempt | `400 { "error": "El reembolso excede lo que queda del pago." }` |
| `reembolsar`, unknown payment | `404 { "error": "Pago no encontrado." }` |
| Not admin | `403 { "error": "..." }` |
| Method not POST | `405` |

## Tests (`tests/admin-pagos.test.js`)

- Non-admin session → 403 on every `accion`, before any DB/Stripe call.
- `aprobarPago` creates a `pagos` row in `estado = 'aprobado'` that
  `pagos-crear-sesion.js` can then act on (integration point with US1).
- `aprobarPago` for a `correo` with no Themora account → 404, no row created.
- `aprobarPago` twice for the same `(correo, servicio, referencia)` → second call
  409, no duplicate row.
- Every successful `aprobarPago` produces exactly one `auditoria_pagos` row.
- `buscar` finds a customer by email and by `TH-…` reference.
- `buscar` for a customer who never paid returns `{ cliente: null }`, not an error.
- `reembolsar` for exactly the remaining refundable amount succeeds.
- `reembolsar` for one cent more than what remains is rejected with 400 and makes no
  Stripe call.
- Every successful `reembolsar` produces exactly one `auditoria_pagos` row (FR-022,
  SC-008).
- `eventosWebhook` surfaces an event with `estado_procesamiento = 'error'`
  (regression guard for FR-016/SC-004).
