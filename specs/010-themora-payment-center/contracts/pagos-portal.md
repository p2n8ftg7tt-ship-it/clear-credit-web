# Contract: Customer Portal session

**Endpoint**: `POST /.netlify/functions/pagos-portal` (new)
**Consumers**: `cuenta.html` — "manage my payment method" / "manage my subscription"
buttons (User Story 3).
**Auth**: requires a valid Supabase session and an existing
`themora_clientes_stripe` row (a customer who has never paid has nothing to manage —
see Responses).

## Request

```json
{ "accessToken": "..." }
```

## Behavior

1. Verify session → 401 if invalid.
2. Look up `stripe_customer_id` for this user → 404-style honest response if none
   exists yet (see below).
3. Create a Stripe Billing Portal session for that customer, `return_url` pointing
   back to `cuenta.html#pagos`.
4. Return the portal URL for the browser to navigate to.

## Responses

| Case | Response |
|---|---|
| Success | `200 { "url": "https://billing.stripe.com/..." }` |
| No/invalid session | `401 { "error": "..." }` |
| No Stripe customer yet (never paid) | `409 { "error": "Todavía no tienes un pago registrado para gestionar." }` |
| Stripe/API not configured | `503 { "noConfigurado": true, "error": "..." }` |
| Stripe API error | `502 { "error": "..." }` |
| Method not POST | `405` |

## Tests (`tests/pagos-portal.test.js`)

- A customer with a Stripe customer id reaches a portal URL.
- A customer with no Stripe customer id yet gets the honest 409, not a crash or a
  broken Stripe call.
- No session → 401.
