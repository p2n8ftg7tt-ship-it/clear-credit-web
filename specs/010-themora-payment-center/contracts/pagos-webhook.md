# Contract: Stripe webhook receiver

**Endpoint**: `POST /.netlify/functions/pagos-webhook` (new)
**Consumers**: Stripe only (configured as this feature's webhook endpoint URL in the
Stripe Dashboard, per the updated `INSTRUCCIONES-PAGOS.md`).
**Auth**: none (public URL) — trust comes entirely from signature verification, never
from session/admin checks (Constitution "Pagos y datos de tarjeta": verify the
signature before trusting the event).

## Request

Raw body exactly as Stripe sends it (unparsed, needed for signature verification),
plus a `Stripe-Signature` header.

## Behavior

1. Compute the expected signature over `timestamp.rawBody` using
   `STRIPE_WEBHOOK_SECRET` (`node:crypto` HMAC-SHA256, R2/R5) and compare to the
   header. Mismatch → reject, no state change, nothing trusted (FR-020).
2. Parse the event; if `eventos_pago_webhook` already has this `stripe_event_id`,
   stop — already processed (FR-007, R5).
3. Insert the `eventos_pago_webhook` row first (`estado_procesamiento` pending),
   *then* apply the effect, so a crash mid-processing still leaves the dedupe
   record in place for the inevitable Stripe retry.
4. Route by event type:
   - `checkout.session.completed` → mark matching `pagos` row `pagado`, capture
     `stripe_payment_intent_id`.
   - `payment_intent.payment_failed` → mark `pagos` row `fallido`.
   - `charge.refunded` → insert/confirm `reembolsos` row, update `pagos.estado`.
   - `charge.dispute.created` / `.closed` → upsert `disputas` row.
   - `customer.subscription.created` / `.updated` / `.deleted` → upsert
     `suscripciones` row (processed unconditionally even while
     `pagos_config.suscripciones_activas = false`, since a real Stripe object
     existing must still be reflected correctly — R6 only gates the customer-facing
     "subscribe" entry point, not reconciliation).
   - `invoice.payment_failed` → mark related subscription `pago_pendiente`.
   - Anything else → record with `estado_procesamiento = 'ignorado'`.
5. Update the `eventos_pago_webhook` row's `estado_procesamiento`/`error_detalle`.

## Responses

| Case | Response |
|---|---|
| Valid, new event, processed | `200 { "recibido": true }` |
| Valid, duplicate event id | `200 { "recibido": true, "duplicado": true }` (Stripe requires 2xx or it keeps retrying — a duplicate is not an error) |
| Invalid signature | `400 { "error": "Firma inválida." }` |
| Processing failed after signature passed (e.g., DB write error) | `500`, but the event row already exists with `estado_procesamiento = 'error'` so it surfaces in the admin webhook-event list (FR-016) even though Stripe will retry the same event |
| Method not POST | `405` |

## Tests (`tests/pagos-webhook.test.js`)

- Rejects a request with a bad/missing signature — 400, zero rows written anywhere.
- The same valid event body/signature processed twice → one `pagos`/`suscripciones`
  row change, `duplicado: true` the second time (User Story 5, FR-007).
- `checkout.session.completed` moves a `pagos` row from `creado` to `pagado`.
- `payment_intent.payment_failed` moves it to `fallido`, never silently dropped
  (FR-012).
- `charge.refunded` for an amount less than the full payment sets
  `reembolsado_parcial`, for the full amount sets `reembolsado`.
- An unknown/future event type is stored as `ignorado`, not an error.
- A simulated DB failure after a valid signature still leaves the event row
  discoverable with `estado_procesamiento = 'error'` (FR-016, SC-004).
