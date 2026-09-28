# Data Model: Themora Payment Center

All tables live in the existing Supabase project (`supabase-schema.sql`), follow its
existing conventions (snake_case Spanish names, `uuid`/`bigint identity` primary keys,
`timestamptz` audit columns, Row Level Security always on), and are written only by
Netlify Functions using `SUPABASE_SERVICE_ROLE_KEY` — the browser's public key never
writes to any of them directly, matching the `tasas_*` / `aparezco_contador` pattern.

## Entities

### `themora_clientes_stripe` — Themora Customer ↔ Stripe Customer link

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` primary key, references `auth.users(id) on delete cascade` | One row per Themora account that has ever paid or subscribed. |
| `stripe_customer_id` | `text` unique, not null | Stripe's `cus_...` id. Created the first time this user pays (FR: "created the first time that person pays or subscribes", spec Key Entities). |
| `created_at` | `timestamptz` default `now()` | |

**RLS**: enabled; policy "ver solo lo propio" (`select` where `auth.uid() = user_id`).
No insert/update/delete policy — only the service role (webhook/checkout functions)
writes here, same shape as `contenido_sitio`'s admin-only write pattern but with no
public writer at all.

**Relationships**: one Themora account → at most one Stripe Customer. All other
payment entities hang off `user_id` (for RLS simplicity) and/or
`stripe_customer_id` (for reconciling webhook payloads, which carry Stripe ids, not
Themora ids).

### `pagos` — Payment (one-time catalog charge)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key default `gen_random_uuid()` | |
| `user_id` | `uuid` not null references `auth.users(id) on delete cascade` | |
| `stripe_checkout_session_id` | `text` unique | Set when the session is created (FR-001, FR-008). |
| `stripe_payment_intent_id` | `text` unique, nullable until Stripe confirms | |
| `servicio` | `text` not null | Key into `pagos-catalogo.js` (`listar`, `formar`, …) — never a free-typed price. |
| `referencia` | `text` not null for this table, matches `^TH-\d{6}-[A-Z2-9]{4}$` | Same reference format `crear-factura.js` already validates; here it's the join key between an admin's approval and the specific customer request (see "Approval precondition" below), so it's required, not optional as it is in the standalone `crear-factura.js` flow. |
| `monto_centavos` | `integer` not null | Copied from the server catalog at approval time, never from the browser (FR-001). |
| `tasas_centavos` | `integer` nullable, check (`tasas_centavos is null or (tasas_centavos >= 0 and tasas_centavos <= 100000)`) | Optional official/state fee added on top of the service price, same $1,000 cap and same "separate line item, never blended" rule `crear-factura.js` already applies (e.g. Virginia's LLC filing fee on `formar`). |
| `tasas_concepto` | `text` nullable, ≤120 chars | Required alongside `tasas_centavos` when it's `> 0`, same rule as `crear-factura.js`. |
| `moneda` | `text` not null default `'usd'` | |
| `estado` | `text` not null check in `('aprobado','creado','pagado','fallido','reembolsado','reembolsado_parcial','disputado')` | `aprobado` is the new entry state (see below); everything from `creado` onward is reconciled exclusively from webhooks (FR-005). |
| `creado_en` | `timestamptz` not null default `now()` | |
| `actualizado_en` | `timestamptz` not null default `now()` | Bumped on every admin- or webhook-driven update. |

**Approval precondition (resolving the eligibility-check conflict found while
planning)**: `listar-negocio.html`/`formar-negocio.html` keep their existing
"Pedir mi presupuesto" flow untouched — staff still confirm eligibility (e.g.
`formar`'s state-by-state coverage) and price in writing before anything is
payable. `pagos-crear-sesion.js` (US1) MUST NOT create a Stripe Checkout Session
from a bare `{ servicio }` request; it MUST find an existing `pagos` row in
`estado = 'aprobado'` matching `(user_id, servicio, referencia)`, created by staff
via `admin-pagos.js`'s `aprobarPago` action (contracts/admin-pagos.md) once they've
confirmed eligibility/price the same way they do today — otherwise the request is
rejected. This is the one deliberate difference from a fully open self-checkout:
the *payment* step becomes self-service, the *eligibility/price confirmation* step
does not (resolved with the project owner during planning).

**RLS**: enabled; "ver solo lo propio" select policy. No customer-writable columns —
admin (`aprobarPago`) and webhook/checkout functions (service role) are the only
writers, which is how `estado` stays trustworthy per the "Stripe as sole authority"
rule.

### `suscripciones` — Subscription

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key default `gen_random_uuid()` | |
| `user_id` | `uuid` not null references `auth.users(id) on delete cascade` | |
| `stripe_subscription_id` | `text` unique not null | |
| `plan` | `text` not null | Plan key, resolved the same way `servicio` is for `pagos` once a real plan exists (see R6 in research.md — inert until `pagos_config.suscripciones_activas` is `true`). |
| `estado` | `text` not null check in `('activa','pago_pendiente','cancelada')` | Mirrors Stripe subscription status categories relevant to spec's User Story 3. |
| `creado_en` / `actualizado_en` | `timestamptz` | |

**RLS**: same shape as `pagos` (own-row select only, service-role writes only).

### `reembolsos` — Refund

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key default `gen_random_uuid()` | |
| `pago_id` | `uuid` not null references `pagos(id)` | |
| `stripe_refund_id` | `text` unique not null | |
| `monto_centavos` | `integer` not null check (`monto_centavos > 0`) | |
| `motivo` | `text` nullable | |
| `admin_user_id` | `uuid` not null references `auth.users(id)` | Who issued it (FR-015, FR-022). |
| `creado_en` | `timestamptz` not null default `now()` | |

**Validation rule** (enforced in `admin-pagos.js`, not just the DB): sum of a
payment's refunds MUST NOT exceed that payment's `monto_centavos` (FR-015, FR-026 —
"an attempt to over-refund MUST be rejected").

**RLS**: enabled; customer sees their own refunds only via a join through `pagos`
(implemented as a `select` policy using `pago_id in (select id from pagos where
user_id = auth.uid())`); only the service role inserts.

### `disputas` — Dispute (chargeback)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key default `gen_random_uuid()` | |
| `pago_id` | `uuid` not null references `pagos(id)` | |
| `stripe_dispute_id` | `text` unique not null | |
| `estado` | `text` not null check in `('necesita_respuesta','en_revision','ganada','perdida')` | |
| `monto_centavos` | `integer` not null | |
| `creado_en` / `actualizado_en` | `timestamptz` | |

**RLS**: enabled, no public policies at all (admin-only view via `admin-pagos.js`
using the service role) — disputes are an operational/admin concern (FR-017), not
something the customer-facing history needs to render as its own list.

### `eventos_pago_webhook` — Webhook Event (idempotency + admin visibility)

| Column | Type | Notes |
|---|---|---|
| `stripe_event_id` | `text` primary key | Stripe's `evt_...` id — the primary key IS the de-duplication mechanism (R5). |
| `tipo` | `text` not null | e.g. `checkout.session.completed`, `invoice.payment_failed`. |
| `estado_procesamiento` | `text` not null check in `('ok','error','ignorado')` | `ignorado` for event types Themora intentionally doesn't act on. |
| `error_detalle` | `text` nullable | Populated when `estado_procesamiento = 'error'`, so a failed webhook is discoverable (FR-016, SC-004) instead of silent. |
| `recibido_en` | `timestamptz` not null default `now()` | |
| `procesado_en` | `timestamptz` nullable | |

**RLS**: enabled, no public policies (service-role-only, same shape as
`aparezco_contador`) — admins read it through `admin-pagos.js`, never directly.

### `auditoria_pagos` — Audit Log Entry

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint generated always as identity primary key` | |
| `admin_user_id` | `uuid` not null references `auth.users(id)` | |
| `accion` | `text` not null | e.g. `reembolso_emitido`, `factura_borrador_creada` (also logs the existing `crear-factura.js` action going forward, since FR-022 says "every admin action that changes payment state," not just new ones). |
| `objetivo` | `text` not null | The `pagos.id`, `referencia`, or Stripe id the action targeted. |
| `detalle` | `jsonb` nullable | Free-form specifics (amount, reason) for that action. |
| `creado_en` | `timestamptz` not null default `now()` | |

**RLS**: enabled, no public policies — admin-read-only via `admin-pagos.js`.

### `pagos_config` — Feature gate (subscriptions readiness)

| Column | Type | Notes |
|---|---|---|
| `id` | `text` primary key, always `'principal'` | Mirrors `tasas_config`'s single-row pattern exactly. |
| `suscripciones_activas` | `boolean` not null default `false` | Flipped to `true` by hand once a real subscription plan exists (R6). |
| `updated_at` | `timestamptz` not null default `now()` | |

**RLS**: enabled, no public policies (read happens server-side inside the Netlify
functions that need to know whether to expose subscription checkout).

## State Transitions

**Payment (`pagos.estado`)**: `aprobado` (admin, after confirming eligibility/price
in writing) → `creado` (customer starts checkout, admin/checkout function only) →
(`pagado` | `fallido`) → optionally `reembolsado` / `reembolsado_parcial` (from
`pagado` only) → optionally `disputado` (from `pagado` or either refunded state,
since a customer can dispute after a partial refund). Every transition from
`creado` onward is driven by a webhook event, never by the customer's browser
redirect back to Themora (which only triggers an optional immediate refresh — the
webhook is what's trusted, per FR-005/FR-006 and User Story 5). Only the
`aprobado` → `creado` step is triggered by a direct customer action
(`pagos-crear-sesion.js`), and only once an admin has already put the row in
`aprobado`.

**Subscription (`suscripciones.estado`)**: `activa` ↔ `pago_pendiente` (renewal
retry cycles, per Stripe's own retry schedule) → `cancelada` (terminal).

**Webhook Event (`eventos_pago_webhook`)**: insert-once. The row's existence is the
terminal state; `estado_procesamiento`/`error_detalle`/`procesado_en` are filled in
by the same insert or a single follow-up update, never re-inserted.
