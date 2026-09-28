---

description: "Task list template for feature implementation"
---

# Tasks: Themora Payment Center

**Input**: Design documents from `/specs/010-themora-payment-center/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Explicitly requested — spec.md FR-025–FR-027 require automated coverage
for every payment-affecting code path, so test tasks are included throughout.

**Organization**: Tasks are grouped by user story (spec.md priorities: US1 and US5
are P1, US2 and US4 are P2, US3 is P3) to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are exact and relative to the repository root.

---

## Phase 1: Setup

**Purpose**: Minimal scaffolding — this feature is additive to an existing flat
repo, so there is no project/dependency initialization to do.

- [ ] T001 Create the `netlify/functions/lib/` directory (empty), ready for the
      shared modules created in Phase 2.
- [ ] T002 [P] Create `tests/fixtures/stripe/` with one trimmed sample JSON payload
      per Stripe event type this feature handles: `checkout-session-completed.json`,
      `payment-intent-payment-failed.json`, `charge-refunded.json`,
      `charge-dispute-created.json`, `customer-subscription-updated.json` — each
      containing only the fields the handlers in this feature actually read (id,
      type, relevant object fields), used by every webhook test below.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared Stripe/catalog code, and the webhook
skeleton every user story is built on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Append the `themora_clientes_stripe` table to `supabase-schema.sql`:
      `user_id uuid primary key references auth.users(id) on delete cascade`,
      `stripe_customer_id text unique not null`, `created_at timestamptz not null
      default now()`; enable RLS; add a `select`-only "ver solo lo propio" policy
      (`auth.uid() = user_id`); no insert/update/delete policy (data-model.md).
- [ ] T004 Append the `pagos` table to `supabase-schema.sql`: `id uuid primary key
      default gen_random_uuid()`, `user_id uuid not null references
      auth.users(id) on delete cascade`, `stripe_checkout_session_id text unique`,
      `stripe_payment_intent_id text unique`, `servicio text not null`,
      `referencia text not null` matching `^TH-\d{6}-[A-Z2-9]{4}$`,
      `monto_centavos integer not null`, `tasas_centavos integer` with check
      `(tasas_centavos is null or (tasas_centavos >= 0 and tasas_centavos <=
      100000))`, `tasas_concepto text` (≤120 chars), `moneda text not null default
      'usd'`, `estado text not null` with check in `('aprobado','creado','pagado',
      'fallido','reembolsado','reembolsado_parcial','disputado')`, `creado_en` /
      `actualizado_en timestamptz not null default now()`; enable RLS; "ver solo lo
      propio" select policy only, no public write policy (data-model.md).
- [ ] T005 Append the `suscripciones` table to `supabase-schema.sql`: `id uuid
      primary key default gen_random_uuid()`, `user_id uuid not null references
      auth.users(id) on delete cascade`, `stripe_subscription_id text unique not
      null`, `plan text not null`, `estado text not null` with check in
      `('activa','pago_pendiente','cancelada')`, `creado_en` / `actualizado_en
      timestamptz`; enable RLS; "ver solo lo propio" select policy only
      (data-model.md).
- [ ] T006 Append the `reembolsos` table to `supabase-schema.sql`: `id uuid primary
      key default gen_random_uuid()`, `pago_id uuid not null references
      pagos(id)`, `stripe_refund_id text unique not null`, `monto_centavos integer
      not null` with check `(monto_centavos > 0)`, `motivo text`, `admin_user_id
      uuid not null references auth.users(id)`, `creado_en timestamptz not null
      default now()`; enable RLS; select policy `pago_id in (select id from pagos
      where user_id = auth.uid())`, no public write policy (data-model.md).
- [ ] T007 Append the `disputas` table to `supabase-schema.sql`: `id uuid primary
      key default gen_random_uuid()`, `pago_id uuid not null references
      pagos(id)`, `stripe_dispute_id text unique not null`, `estado text not
      null` with check in `('necesita_respuesta','en_revision','ganada',
      'perdida')`, `monto_centavos integer not null`, `creado_en` /
      `actualizado_en timestamptz`; enable RLS, no public policies (data-model.md).
- [ ] T008 Append the `eventos_pago_webhook` table to `supabase-schema.sql`:
      `stripe_event_id text primary key`, `tipo text not null`,
      `estado_procesamiento text not null` with check in `('ok','error',
      'ignorado')`, `error_detalle text`, `recibido_en timestamptz not null
      default now()`, `procesado_en timestamptz`; enable RLS, no public policies
      (data-model.md — the primary key IS the de-duplication mechanism).
- [ ] T009 Append the `auditoria_pagos` table to `supabase-schema.sql`: `id bigint
      generated always as identity primary key`, `admin_user_id uuid not null
      references auth.users(id)`, `accion text not null`, `objetivo text not
      null`, `detalle jsonb`, `creado_en timestamptz not null default now()`;
      enable RLS, no public policies (data-model.md).
- [ ] T010 Append the `pagos_config` table to `supabase-schema.sql`, mirroring the
      existing `tasas_config` pattern exactly: `id text primary key` (always
      `'principal'`), `suscripciones_activas boolean not null default false`,
      `updated_at timestamptz not null default now()`; seed the single row with
      `insert into public.pagos_config (id) values ('principal') on conflict (id)
      do nothing;`; enable RLS, no public policies (data-model.md, research.md R6).
- [ ] T011 [P] Create `netlify/functions/lib/pagos-catalogo.js`: move the
      `SERVICIOS` map and `MAX_TASAS_CENTAVOS` constant out of
      `netlify/functions/crear-factura.js` verbatim (unchanged values/keys —
      `listar`: 4999 cents, `formar`: 14900 cents, cap 100000 cents) and export
      them, so there is exactly one place in the codebase this catalog lives
      (research.md R4, Constitution Principle IV).
- [ ] T012 [P] Create `netlify/functions/lib/pagos-stripe.js`: move the `stripe()`
      fetch-wrapper, `formEncode()`, and `esAdmin(accessToken)` helpers out of
      `netlify/functions/crear-factura.js` verbatim, and export them for reuse by
      every function created below (research.md R2, R7).
- [ ] T013 Add `verificarFirmaWebhook(rawBody, signatureHeader, secret)` to
      `netlify/functions/lib/pagos-stripe.js`: parse Stripe's `Stripe-Signature`
      header (`t=<timestamp>,v1=<hex hmac>`), compute HMAC-SHA256 over
      `` `${t}.${rawBody}` `` using `secret` via Node's built-in `crypto` module,
      and return whether it matches `v1` — no `stripe` npm package (research.md
      R2, Constitution "Pagos y datos de tarjeta").
- [ ] T014 Add `idempotencyKey(...parts)` to `netlify/functions/lib/pagos-stripe.js`:
      joins the given parts into a single deterministic string suitable for
      Stripe's `Idempotency-Key` header (research.md R5, Constitution "Pagos y
      datos de tarjeta").
- [ ] T015 Refactor `netlify/functions/crear-factura.js` to import `SERVICIOS` /
      `MAX_TASAS_CENTAVOS` from `pagos-catalogo.js` and `stripe()` / `formEncode` /
      `esAdmin` from `pagos-stripe.js`, deleting its own now-duplicated inline
      copies. Behavior MUST NOT change — this is a pure extraction.
- [ ] T016 Create `netlify/functions/pagos-webhook.js`: reject non-POST with 405;
      read the raw body (required for signature verification — do not
      `JSON.parse` before checking the signature); verify it with T013's
      `verificarFirmaWebhook` against `STRIPE_WEBHOOK_SECRET`, responding `400
      { "error": "Firma inválida." }` on mismatch with zero writes; on success,
      attempt to insert the event's id into `eventos_pago_webhook` — a unique-
      constraint conflict means it's already been processed, so respond `200
      { recibido: true, duplicado: true }` immediately; otherwise dispatch by
      `event.type` through a lookup object with a default case that marks the
      event `ignorado`; wrap the dispatch in try/catch, updating
      `estado_procesamiento`/`error_detalle`/`procesado_en` on the same row
      afterward; respond `200 { recibido: true }` on success, `500` (with the
      error row already persisted) if the dispatched handler throws
      (contracts/pagos-webhook.md).
- [ ] T017 [P] Write `tests/pagos-webhook.test.js` covering exactly the
      foundational behavior built in T016, using `tests/fixtures/stripe/*.json`:
      a request with a bad/missing signature → 400, zero rows written anywhere;
      the same valid event body/signature processed twice → `duplicado: true`
      the second time, no state change; an event type with no registered case →
      stored `ignorado`, not treated as an error (contracts/pagos-webhook.md
      Tests).
- [ ] T018 [P] Write `tests/pagos-catalogo.test.js` verifying `pagos-catalogo.js`'s
      values are exactly what `crear-factura.js` sends to Stripe after T015's
      refactor (regression guard for Constitution Principle IV — one price catalog,
      never two).

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Pay for an approved catalog item (Priority: P1) 🎯 MVP

**Goal**: Once staff have confirmed eligibility/price in writing through the
*existing, unchanged* "Pedir mi presupuesto" flow on `listar-negocio.html` /
`formar-negocio.html` and marked that specific request approved, the customer pays
it via Stripe-hosted Checkout from their own account with no further admin step.

**Independent Test**: An admin marks a test customer's `(servicio, referencia)`
approved; that customer signs in, sees the item as payable, completes a Stripe
test-mode checkout, and the payment shows as `pagado` — with no admin action in
between the approval and the pay button.

### Implementation for User Story 1

- [ ] T019 [US1] Create `netlify/functions/admin-pagos.js` with only the
      `aprobarPago` action for now: `esAdmin` check (403 if not admin); validate
      `servicio` against `pagos-catalogo.js` (400 if unknown), `referencia` against
      `^TH-\d{6}-[A-Z2-9]{4}$` (400 if malformed), `tasasCentavos`/`tasasConcepto`
      against the same cap/pairing rule `crear-factura.js` already enforces;
      resolve `correo` to a Supabase `user_id` via the Admin API using
      `SUPABASE_SERVICE_ROLE_KEY` (404 if no account with that email); insert a
      `pagos` row with `estado = 'aprobado'` and the catalog's `monto_centavos`
      (409 if a row for this exact `(user_id, servicio, referencia)` already
      exists); insert a matching `auditoria_pagos` row (`accion:
      "pago_aprobado"`) in the same operation (contracts/admin-pagos.md).
- [ ] T020 [P] [US1] Write `tests/admin-pagos.test.js` covering `aprobarPago`:
      non-admin session → 403 before any DB call; success creates one `aprobado`
      row and exactly one `auditoria_pagos` row; unknown `correo` → 404, no row
      created; duplicate `(correo, servicio, referencia)` → 409, no duplicate row
      (contracts/admin-pagos.md Tests).
- [ ] T021 [US1] Create `netlify/functions/pagos-crear-sesion.js`: verify Supabase
      session (401 if invalid); look up the `pagos` row for
      `(user_id, servicio, referencia)` — 409 `{ "error": "Todavía no hay nada
      aprobado para pagar con esa referencia." }` if none exists or it isn't
      `estado = 'aprobado'`; look up or create the caller's
      `themora_clientes_stripe` row (creating the Stripe Customer via
      `pagos-stripe.js`'s `stripe()` helper if this is their first payment);
      create a Stripe Checkout Session (`mode: "payment"`) using the row's own
      `monto_centavos` (+ `tasas_centavos` as a separate line item if present —
      never re-read from the request body), sending an `Idempotency-Key` from
      T014's helper built from `(user_id, servicio, referencia)`; update that same
      `pagos` row to `estado = 'creado'` with the session id; return `200 { url }`;
      respond `503 { noConfigurado: true }` if `STRIPE_SECRET_KEY` is unset
      (contracts/pagos-crear-sesion.md).
- [ ] T022 [P] [US1] Write `tests/pagos-crear-sesion.test.js` per
      contracts/pagos-crear-sesion.md Tests: 401 with no/invalid session; 400 for
      unknown `servicio`; 409 when no matching `aprobado` row exists, including
      when the row belongs to a different user; the amount (and any
      `tasas_centavos`) sent to Stripe always comes from the approved row, never
      the request body; an existing `stripe_customer_id` is reused rather than
      creating a second Stripe Customer; two rapid identical requests (same
      idempotency key) move the same `pagos` row to `creado` exactly once, never
      creating a second row; missing `STRIPE_SECRET_KEY` → 503 `noConfigurado`.
- [ ] T023 [US1] Add `checkout.session.completed` and
      `payment_intent.payment_failed` cases to `pagos-webhook.js`'s dispatcher
      (built in T016): the first marks the matching `pagos` row `pagado` and
      captures `stripe_payment_intent_id`; the second marks it `fallido`
      (contracts/pagos-webhook.md).
- [ ] T024 [P] [US1] Extend `tests/pagos-webhook.test.js`: a
      `checkout.session.completed` event moves a `pagos` row from `creado` to
      `pagado`; a `payment_intent.payment_failed` event moves it to `fallido` and
      is never silently dropped (FR-012).
- [ ] T025 [US1] Add a "Pagos" tab to `cuenta.html`: for now, a minimal inline
      list of the signed-in customer's `pagos` rows in `estado` `aprobado` or
      `creado` (full history display is User Story 2), each with a "Pagar ahora"
      button that calls `pagos-crear-sesion` for that row's `servicio`/
      `referencia` and navigates the browser to the returned `url`.

**Checkpoint**: User Story 1 is fully functional and independently testable —
approve a test customer via `aprobarPago`, sign in as them, pay, see `pagado`.

---

## Phase 4: User Story 5 - Payment state stays correct when things go wrong (Priority: P1)

**Goal**: Prove the reliability mechanisms built into Phase 2/3
(signature verification, event-id de-duplication, idempotency keys) actually hold
under duplicate delivery, delayed/out-of-order delivery, and mid-operation
failures.

**Independent Test**: Replay the same payment-confirmed event twice; deliver a
failed-then-succeeded pair out of order; simulate a network failure between
Stripe's response and Themora's write, then retry — confirm no duplicate charges,
no duplicate history entries, and every anomaly is discoverable afterward.

### Implementation for User Story 5

- [ ] T026 [P] [US5] Extend `tests/pagos-crear-sesion.test.js`: simulate a network
      failure between Stripe's Checkout Session response and Themora's database
      write, then retry the identical request (same idempotency key) — confirm
      exactly one Checkout Session and one `pagos` row transition to `creado`,
      never two (User Story 5 Acceptance Scenario 3, FR-008).
- [ ] T027 [P] [US5] Extend `tests/pagos-webhook.test.js`: deliver
      `payment_intent.payment_failed` for a payment, then later deliver
      `checkout.session.completed` for the same payment (out-of-order relative to
      when the actual charge succeeded) — confirm the row ends up `pagado`, the
      correct final state, not stuck on the earlier `fallido` (User Story 5
      Acceptance Scenario 2).
- [ ] T028 [US5] Further extend `tests/pagos-webhook.test.js` (same file as T027,
      sequential): simulate a database write failure inside the dispatched
      handler after the signature already passed — confirm the `eventos_pago_
      webhook` row still ends up with `estado_procesamiento = 'error'` and
      `error_detalle` populated, discoverable rather than silently lost (FR-016,
      SC-004, User Story 5 Acceptance Scenario 4).

**Checkpoint**: User Stories 1 and 5 together form a reliable, independently
demonstrable MVP.

---

## Phase 5: User Story 2 - See my own payment history and invoices (Priority: P2)

**Goal**: The customer sees every payment, invoice, and subscription status in
their own account, honestly represented (including failures and empty states).

**Independent Test**: Sign in as a customer with at least one prior payment;
confirm the history, invoice links, and status all match what Stripe shows for
that customer.

### Implementation for User Story 2

- [ ] T029 [US2] Create `netlify/functions/pagos-historial.js`: verify Supabase
      session (401 if invalid); return `200 { pagos: [...], suscripcion: {...} |
      null }` for the caller's own rows only (RLS as defense in depth), each
      `pagos` entry including `id`, `servicio`, `montoCentavos`, `estado`,
      `creadoEn`, and `facturaUrl` (Stripe's own hosted invoice URL, never
      re-rendered); an empty history returns `{ pagos: [], suscripcion: null }`,
      not an error (contracts/pagos-historial.md).
- [ ] T030 [P] [US2] Write `tests/pagos-historial.test.js` per
      contracts/pagos-historial.md Tests: only rows matching the authenticated
      session are returned; a failed payment appears with `estado: "fallido"`,
      not hidden; a customer with zero payments gets the empty-but-honest shape;
      no session → 401 with no data leaked.
- [ ] T031 [US2] Replace T025's minimal inline list in `cuenta.html`'s "Pagos" tab
      with the full history view backed by `pagos-historial.js`: payment list
      with plain-language status labels for every `pagos.estado` value
      (`aprobado`, `creado`, `pagado`, `fallido`, `reembolsado`,
      `reembolsado_parcial`, `disputado`), invoice links via `facturaUrl`, and
      subscription status if present.

**Checkpoint**: User Stories 1, 5, and 2 are all independently functional.

---

## Phase 6: User Story 4 - Run payment operations from the admin panel (Priority: P2)

**Goal**: Staff search for a customer and see/manage their payments,
subscriptions, invoices, refunds, and disputes from `admin.html`, without leaving
Themora — alongside the existing, untouched manual-invoice tool.

**Independent Test**: An admin searches for a test customer by email, views their
payment/subscription history, and issues a refund that then appears in that
customer's own history (User Story 2).

### Implementation for User Story 4

- [ ] T032 [US4] Add the `buscar` action to `netlify/functions/admin-pagos.js`
      (built in T019): given an email or `TH-…` reference, return that customer's
      `pagos`, `suscripciones`, `reembolsos`, and `disputas` together; no match →
      `200 { cliente: null }`, not a 404 (contracts/admin-pagos.md).
- [ ] T033 [P] [US4] Write `tests/admin-pagos.test.js` additions for `buscar`:
      found by email, found by `TH-…` reference, `{ cliente: null }` for no match.
- [ ] T034 [US4] Add the `reembolsar` action to `admin-pagos.js`: compute
      `ya_reembolsado` from existing `reembolsos` rows for the target `pagoId`;
      reject with 400 (no Stripe call) if `montoCentavos` exceeds what remains
      refundable; otherwise call Stripe's refund endpoint with an idempotency key
      from `(pagoId, adminUserId, montoCentavos)`; insert `reembolsos` and
      `auditoria_pagos` rows in the same operation (contracts/admin-pagos.md).
- [ ] T035 [US4] Extend `tests/admin-pagos.test.js` for `reembolsar`: a refund for
      exactly the remaining refundable amount succeeds; one cent over the
      remaining amount is rejected with 400 and makes no Stripe call; every
      successful refund produces exactly one `auditoria_pagos` row (FR-026,
      SC-008); a retried identical `reembolsar` request (same `pagoId`/
      `adminUserId`/`montoCentavos`, so the same idempotency key) results in
      exactly one Stripe refund and one `reembolsos` row, never two (User Story 5
      Acceptance Scenario 3, closing the refund half of that requirement).
- [ ] T036 [US4] Add `charge.refunded`, `charge.dispute.created`, and
      `charge.dispute.closed` cases to `pagos-webhook.js`'s dispatcher: the first
      confirms/updates the matching `reembolsos` row and sets `pagos.estado` to
      `reembolsado` (full) or `reembolsado_parcial` (partial); the dispute events
      upsert a `disputas` row (contracts/pagos-webhook.md).
- [ ] T037 [US4] Extend `tests/pagos-webhook.test.js` (same file as prior phases,
      sequential): `charge.refunded` for less than the full amount sets
      `reembolsado_parcial`, for the full amount sets `reembolsado`; a dispute
      event upserts a `disputas` row correctly.
- [ ] T038 [US4] Add the `eventosWebhook` and `disputas` (list) actions to
      `admin-pagos.js` (FR-016, FR-017).
- [ ] T039 [US4] Extend `tests/admin-pagos.test.js`: `eventosWebhook` surfaces an
      event with `estado_procesamiento = 'error'` (regression guard, FR-016/
      SC-004); `disputas` lists an open dispute.
- [ ] T040 [US4] Add a "Pagos" panel to `admin.html`: `aprobarPago` form (wiring
      up T019 from the customer's UI side), customer search (`buscar`), a
      per-customer view with a refund button (`reembolsar`), a disputes list, a
      webhook-events list (including failed ones), and an audit-log view —
      placed alongside the existing, untouched `facturas()` section.

**Checkpoint**: User Stories 1, 5, 2, and 4 are all independently functional.

---

## Phase 7: User Story 3 - Manage my payment method and subscription (Priority: P3)

**Goal**: A customer with a recurring plan manages their card/subscription via
Stripe's Customer Portal. Built end-to-end now, but stays invisible to customers
until `pagos_config.suscripciones_activas` is turned on (research.md R6) — no real
subscription product exists in the catalog yet.

**Independent Test**: A subscribed test customer opens "manage my subscription,"
reaches Stripe's Customer Portal, changes their card, and returns to Themora with
the change reflected.

### Implementation for User Story 3

- [ ] T041 [US3] Create `netlify/functions/pagos-portal.js`: verify Supabase
      session (401 if invalid); look up `stripe_customer_id` — `409 { "error":
      "Todavía no tienes un pago registrado para gestionar." }` if none exists
      yet; create a Stripe Billing Portal session with `return_url` pointing to
      `cuenta.html#pagos`; return `200 { url }` (contracts/pagos-portal.md).
- [ ] T042 [P] [US3] Write `tests/pagos-portal.test.js` per
      contracts/pagos-portal.md Tests: portal URL returned for a customer with a
      Stripe customer id; honest 409 for a customer with none yet; 401 with no
      session.
- [ ] T043 [US3] Add `customer.subscription.created`,
      `customer.subscription.updated`, `customer.subscription.deleted`, and
      `invoice.payment_failed` cases to `pagos-webhook.js`'s dispatcher: upsert
      the matching `suscripciones` row regardless of
      `pagos_config.suscripciones_activas` — a real Stripe subscription object
      must reconcile correctly even while the feature is inactive, since R6 only
      gates the customer-facing entry point, not reconciliation
      (contracts/pagos-webhook.md).
- [ ] T044 [US3] Extend `tests/pagos-webhook.test.js` (sequential, same file):
      subscription created/renewed/past-due/cancelled events all reconcile
      `suscripciones.estado` correctly (FR-027).
- [ ] T045 [US3] Add a "manage payment method / subscription" button to
      `cuenta.html`'s "Pagos" tab that calls `pagos-portal.js` and navigates to
      the returned URL — rendered whenever the customer already has a
      `stripe_customer_id` (a one-time payment already gives them a card on file
      worth managing, independent of whether subscriptions themselves are
      active).

**Checkpoint**: All five user stories are now independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T046 [P] Update `INSTRUCCIONES-PAGOS.md` with the new steps:
      `STRIPE_WEBHOOK_SECRET`, configuring the webhook endpoint URL in the Stripe
      Dashboard, and how the new catalog self-checkout path (via `aprobarPago`
      after the existing quote/eligibility confirmation) differs from the
      existing, unchanged bespoke-invoice steps. Constitution "Documentación
      junto al cambio" — this MUST land before either path is turned on for real
      customers.
- [ ] T047 [P] Add categorical-only Umami events (e.g. `pago_iniciado`,
      `pago_completado`, `pago_fallido` — stage names only, never amounts, emails,
      or free text) to the new "Pagos" tab interactions in `cuenta.html`,
      per Constitution Principle II.
- [ ] T048 [P] Resolve the account-deletion/active-subscription edge case in
      `eliminar-cuenta.js`: require the subscription be cancelled first (or an
      explicit confirmation) rather than silently orphaning an active
      subscription (spec.md Edge Cases).
- [ ] T049 Run `graphify update .` to refresh `graphify-out/` after all the above
      code changes have landed (Constitution "Grafo de conocimiento").
- [ ] T050 Run `node --test tests/` for the complete suite (existing tests plus
      every new file above) and confirm everything passes.
- [ ] T051 Execute `quickstart.md` Scenarios 1–6 end-to-end in Stripe test mode
      before ever setting a live `STRIPE_SECRET_KEY`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS every user story.
- **User Stories (Phase 3–7)**: All depend on Foundational completion.
  - US1 (P1) and US5 (P1) should be built first, in that order (US5 tests the
    mechanisms US1's phase exercises for the first time).
  - US2 and US4 (P2) can follow in either order once US1/US5 are done; US4 does
    depend on `admin-pagos.js` existing (created in US1's T019) but not on US2.
  - US3 (P3) can start any time after Foundational, but naturally comes last since
    it stays invisible to customers regardless (research.md R6).
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories. This is the MVP.
- **US5 (P1)**: Builds on the webhook skeleton (Phase 2) and US1's checkout path
  to prove reliability; its refund-specific closure happens inside US4's own test
  additions (T035) since the refund action itself is built there.
- **US2 (P2)**: Independent of US4/US3; reuses the `pagos`/`suscripciones` rows
  US1 already produces.
- **US4 (P2)**: Reuses `admin-pagos.js` (created in US1's T019); independent of
  US2/US3 otherwise.
- **US3 (P3)**: Independent of US2/US4; stays inert for customers until
  `pagos_config.suscripciones_activas = true`.

### Within Each User Story

- Contract/behavior implementation before its own tests are extended to cover it.
- Shared files (`pagos-webhook.js`, `admin-pagos.js`, `cuenta.html`,
  `tests/pagos-webhook.test.js`, `tests/admin-pagos.test.js`) are touched by more
  than one phase — these edits are sequential across phases by design, never
  parallel with each other.
- Story complete (checkpoint reached) before moving to the next priority.

### Parallel Opportunities

- T002 (Setup) has no dependency and can run alongside T001.
- T011/T012 (Phase 2, new files) can run in parallel; T013/T014 must follow T012
  sequentially (same file).
- T017/T018 (Phase 2, different new test files) can run in parallel.
- T020/T022 (US1, different test files) can run in parallel.
- T026/T027 (US5, different test files) can run in parallel; T028 must follow
  T027 sequentially (same file).
- T042 (US3) can run in parallel with any US3 task touching a different file.
- T046/T047/T048 (Polish, three different files) can all run in parallel.

---

## Parallel Example: Foundational shared modules

```bash
Task: "Create netlify/functions/lib/pagos-catalogo.js (T011)"
Task: "Create netlify/functions/lib/pagos-stripe.js (T012)"
```

## Parallel Example: User Story 1 tests

```bash
Task: "Write tests/admin-pagos.test.js for aprobarPago (T020)"
Task: "Write tests/pagos-crear-sesion.test.js (T022)"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 5)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (schema, shared lib, webhook skeleton).
3. Complete Phase 3: User Story 1 — a real, working, reliable self-checkout path
   for staff-approved catalog items.
4. Complete Phase 4: User Story 5 — prove it holds under duplicate/delayed/failed
   delivery.
5. **STOP and VALIDATE**: run `quickstart.md` Scenarios 1–3 and 5 in Stripe test
   mode.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 + US5 → reliable MVP (approve → pay → correct state, even under failure).
3. US2 → customers can see their own history without asking staff.
4. US4 → staff can operate (search, refund, see disputes/webhook events/audit)
   without leaving Themora.
5. US3 → subscription management ships, inert, ready for the day a recurring plan
   exists.
6. Polish → documentation, analytics, the account-deletion edge case, graph
   refresh, full test run, full quickstart run.

## Notes

- [P] tasks touch different files with no incomplete dependency.
- Every task that edits a file shared with an earlier task in the same phase is
  deliberately left unmarked (sequential), even where a later phase's edit to
  that same file elsewhere in this document is marked [P] relative to a sibling
  in *its own* phase — parallelism is only ever claimed within one phase's batch.
- Commit after each task or logical group, per Constitution "Cambios por partes
  pequeñas."
- `crear-factura.js`'s behavior does not change anywhere in this plan (T015 is a
  pure extraction) — verify this by hand once T015 lands, since no automated test
  file exists for it today.
