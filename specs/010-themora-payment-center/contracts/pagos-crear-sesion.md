# Contract: Create catalog checkout session

**Endpoint**: `POST /.netlify/functions/pagos-crear-sesion` (new)
**Consumers**: `cuenta.html` (new "Pagos" tab — a "Pagar ahora" button appears there
only for the signed-in customer's own approved-and-unpaid items).
**Auth**: requires a valid Supabase session (any signed-in customer — no admin
needed). Same session-check shape as `coach.js`.

**Precondition (data-model.md "Approval precondition")**: this endpoint never opens
checkout for an arbitrary catalog key on demand. `listar-negocio.html`/
`formar-negocio.html` keep their existing "Pedir mi presupuesto" → staff confirms
eligibility/price in writing flow unchanged; only after staff record that approval
via `admin-pagos.js`'s `aprobarPago` action does a payable row exist for this
endpoint to act on. This keeps `formar`'s state-by-state eligibility check (and any
future service with similar gating) intact — only the *payment* step is
self-service, not the *eligibility* step.

## Request

```json
{ "servicio": "listar", "referencia": "TH-260926-AB12" }
```

- `servicio`: required, must be a key in `netlify/functions/lib/pagos-catalogo.js`.
- `referencia`: required (not optional here — see Precondition), MUST match
  `^TH-\d{6}-[A-Z2-9]{4}$` (same pattern `crear-factura.js` already validates), and
  MUST identify a `pagos` row already in `estado = 'aprobado'` for this signed-in
  user.

## Behavior

1. Verify Supabase session → 401 if missing/invalid.
2. Look up the `pagos` row for `(user_id, servicio, referencia)` → 409 if missing or
   not in `estado = 'aprobado'` (already paid, wrong customer, or never approved).
3. Look up or create the caller's row in `themora_clientes_stripe` (creating the
   Stripe Customer via REST if this is their first payment — R4/data-model.md).
4. Create a Stripe Checkout Session (`mode: "payment"`) using the amount already
   stored on the approved row (`monto_centavos` + optional `tasas_centavos` as a
   separate line item — never re-read from the browser, FR-001), sending an
   `Idempotency-Key` derived from `(user_id, servicio, referencia)` (R5) so a
   doubled click/request never creates two sessions.
5. Update that same `pagos` row to `estado = 'creado'` with the session id (never
   insert a second row for the same approval).
6. Return the session URL for the browser to navigate to.

## Responses

| Case | Response |
|---|---|
| Success | `200 { "url": "https://checkout.stripe.com/..." }` |
| No session | `401 { "error": "Inicia sesión para pagar." }` |
| Unknown service | `400 { "error": "Servicio desconocido." }` |
| Invalid `referencia` format | `400 { "error": "..." }` |
| No matching approved row (never approved / already paid / belongs to someone else) | `409 { "error": "Todavía no hay nada aprobado para pagar con esa referencia." }` |
| Stripe/API not configured (`STRIPE_SECRET_KEY` missing) | `503 { "noConfigurado": true, "error": "..." }` (same shape `crear-factura.js` uses) |
| Stripe API error | `502 { "error": "Stripe no aceptó el pago: ..." }` |
| Method not POST | `405` |

Headers: `Cache-Control: no-store` on every response (matches every existing
function in `netlify/functions/`).

## Tests (`tests/pagos-crear-sesion.test.js`)

- Rejects with 401 when no/invalid session.
- Rejects unknown `servicio` with 400, never reaching Stripe.
- Rejects with 409 when no `pagos` row is `aprobado` for `(user, servicio,
  referencia)` — including when the row exists but belongs to a different user
  (regression test for the eligibility-bypass risk this precondition exists to
  close).
- Amount (and any `tasas_centavos`) sent to Stripe always comes from the approved
  `pagos` row, never from the request body.
- Reuses an existing `stripe_customer_id` for a returning customer instead of
  creating a second Stripe Customer (mirrors `crear-factura.js`'s existing
  customer-reuse logic).
- Two rapid identical requests (same idempotency key) result in exactly one
  Checkout Session and the same `pagos` row moved to `creado` once, not a second row.
- Missing `STRIPE_SECRET_KEY` → `503 noConfigurado`, no crash.
