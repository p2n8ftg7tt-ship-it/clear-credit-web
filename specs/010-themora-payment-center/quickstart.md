# Quickstart: Validating the Themora Payment Center

Everything here runs in **Stripe test mode** (`STRIPE_SECRET_KEY` starting with
`sk_test_`) — no real money moves. This mirrors how `crear-factura.js` is already
verified today (`INSTRUCCIONES-PAGOS.md`, Paso 3).

## Prerequisites

- Netlify env vars set (test values): `STRIPE_SECRET_KEY` (`sk_test_...`),
  `STRIPE_WEBHOOK_SECRET` (`whsec_...`), plus the existing `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase-schema.sql`'s new tables (see data-model.md) applied via the Supabase
  SQL Editor, same as any other schema change to this project.
- Stripe CLI (`stripe login`, then `stripe listen --forward-to
  localhost:8888/.netlify/functions/pagos-webhook` during local testing, or a test
  webhook endpoint configured in the Stripe Dashboard pointing at the deployed
  preview URL) — needed because webhooks can't reach `localhost` without it.
- `node --test tests/` passes for the existing suite before starting (baseline).

## Scenario 1 — One-time catalog payment (User Story 1)

1. As an admin, call `admin-pagos` with `accion: "aprobarPago"` for the test
   customer's email, `servicio: "listar"`, and a `TH-…` reference — standing in for
   staff having already confirmed eligibility/price via the existing
   "Pedir mi presupuesto" flow on `listar-negocio.html`.
2. Sign in as that test customer on `cuenta.html`; the "Pagos" tab shows the
   approved item with a "Pagar ahora" button.
3. Trigger `pagos-crear-sesion` for that `servicio`/`referencia` (via the button, or
   directly per `contracts/pagos-crear-sesion.md`).
4. On the resulting Stripe Checkout page, pay with `4242 4242 4242 4242`, any future
   date, any CVC (Stripe's standard test card — same one `INSTRUCCIONES-PAGOS.md`
   Paso 3 already references).
5. **Expected**: Stripe redirects back to Themora; within ~60 seconds (webhook
   delivery, not the redirect itself) the `pagos` row for this session is `pagado`
   and shows up via `pagos-historial` (SC-002).

## Scenario 2 — Declined card (User Story 1, edge case)

1. Repeat Scenario 1 using Stripe's decline test card `4000 0000 0000 0002`.
2. **Expected**: checkout shows the decline, no `pagado` row is created;
   `payment_intent.payment_failed` lands the row as `fallido` (FR-012).

## Scenario 3 — Duplicate webhook delivery (User Story 5)

1. Using the Stripe CLI, resend the same event: `stripe events resend
   evt_...` (or replay the same payload/signature against
   `pagos-webhook` twice manually).
2. **Expected**: second delivery responds `200 { recibido: true, duplicado: true }`
   and no second `pagos` row, no second entry in the customer's history (SC-003).

## Scenario 4 — Refund (User Story 4)

1. As an admin on `admin.html`, search for the test customer from Scenario 1.
2. Issue a refund for the full amount via `admin-pagos` (`accion: "reembolsar"`).
3. **Expected**: Stripe processes the test refund; the `charge.refunded` webhook
   flips `pagos.estado` to `reembolsado`; the customer's own history reflects it
   within 2 minutes (SC-006); exactly one `auditoria_pagos` row exists for this
   action (SC-008).
4. Attempt a second refund for any amount on the same payment.
   **Expected**: rejected before any Stripe call (`contracts/admin-pagos.md`).

## Scenario 5 — Webhook signature tampering

1. Send a request to `pagos-webhook` with a valid-looking body but a wrong/missing
   `Stripe-Signature` header.
2. **Expected**: `400`, nothing written to `pagos`/`eventos_pago_webhook` at all
   (FR-020).

## Scenario 6 — Subscription infrastructure stays inert (R6)

1. With `pagos_config.suscripciones_activas = false` (the default), confirm
   `cuenta.html` and `pago.js` show no "subscribe" entry point anywhere.
2. Directly exercise the subscription webhook handling in `pagos-webhook.md`'s test
   suite (not through any UI, since none exists yet) to confirm a
   `customer.subscription.*` event still reconciles a `suscripciones` row
   correctly — proving the pipe works before it's ever turned on.

## Before moving to Stripe live mode

Follow the same discipline `INSTRUCCIONES-PAGOS.md` already documents for
`crear-factura.js`: swap `sk_test_...` for `sk_live_...` and the matching live
`STRIPE_WEBHOOK_SECRET` only after every scenario above has been run once in test
mode, and only after `INSTRUCCIONES-PAGOS.md` has been updated to describe the new
catalog self-checkout path (Constitution "Documentación junto al cambio" — the site
MUST NOT mention self-checkout publicly before that).
