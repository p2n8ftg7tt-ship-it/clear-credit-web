# Phase 0 Research: Themora Payment Center

## R1: Reconcile self-service checkout with the existing "never charges alone" policy

**Decision**: Catalog-priced services (`listar`, `formar` — the same two in
`crear-factura.js`'s `SERVICIOS` map) move to automatic Stripe Checkout: the customer
pays and the charge completes with no admin step in between. Bespoke/off-catalog
invoices keep the existing admin-reviewed-draft flow (`crear-factura.js`) untouched.

**Rationale**: Confirmed directly with the project owner (see spec.md's resolved
clarifications). `INSTRUCCIONES-PAGOS.md`'s "Lo que este sitio nunca hace → No cobra
solo" describes today's *only* payment path, not an immutable rule; the owner chose to
carve out an explicit, narrow exception for fixed-price catalog items while keeping
the human-review safety net for everything priced by hand. `INSTRUCCIONES-PAGOS.md`
MUST be updated during implementation to describe the new catalog path and make clear
the manual path still applies to bespoke work — the Constitution's "Documentación
junto al cambio" rule requires this before the site publicly mentions self-checkout.

**Alternatives considered**:
- Automate creation but require an admin "release" click for every charge (rejected:
  the owner picked the narrower, catalog-only automation instead).
- No self-service at all, Payment Center as pure dashboard (rejected: same reason).

## R2: Stripe integration approach — raw REST vs. `stripe` npm SDK

**Decision**: Continue the raw `fetch` + `application/x-www-form-urlencoded` pattern
already used in `crear-factura.js`, extracted into a shared helper
(`netlify/functions/lib/pagos-stripe.js`) reused by every new function. Webhook
signature verification uses Node's built-in `crypto` module (HMAC-SHA256 over
`timestamp.payload`, matching Stripe's documented `Stripe-Signature` scheme) instead
of the SDK's `stripe.webhooks.constructEvent`.

**Rationale**: The repo has no `package.json` and no build step (Constitution:
"Sitio estático sin paso de compilación" / "No se añade ... una dependencia nueva sin
evidencia de que lo existente no alcanza"). `crear-factura.js` already proves the raw
REST approach is sufficient for customers, invoices, invoice items. Checkout Sessions,
Subscriptions, Refunds and the Customer Portal are all plain REST endpoints with the
same auth scheme, so no new capability requires the SDK. Signature verification is a
single HMAC computation, well within what `node:crypto` (built into the Netlify
Functions Node runtime) provides.

**Alternatives considered**:
- `stripe` npm package (rejected: would require introducing `package.json` and
  `node_modules` to a repo that deliberately has neither, for no capability gain).

## R3: Content-Security-Policy impact of Stripe Checkout / Customer Portal

**Decision**: No `netlify.toml` CSP change is required for hosted Checkout or the
Customer Portal, because both are reached via a full top-level browser redirect
(`window.location.href = session.url`) to `checkout.stripe.com` / Stripe's portal
domain, not an embedded frame or a `fetch`/`XHR` call from Themora's own pages. CSP's
`script-src`/`connect-src`/`frame-src` directives do not govern top-level navigation.

**Rationale**: Confirmed against the existing CSP in `netlify.toml`
(`connect-src 'self' https://*.supabase.co https://cloud.umami.is https://gateway.umami.is`)
— it already has no Stripe entry, and the existing (working) invoice flow in
`crear-factura.js`/`pago.js` never needed one, because the customer follows a link to
Stripe's own hosted page rather than Themora embedding Stripe UI. The new functions
follow the same shape: Themora's server creates the Session via REST, returns a URL,
the browser navigates there directly.

**Alternatives considered**:
- Embedded Stripe Elements/Checkout (rejected: would require adding `js.stripe.com` to
  `script-src` and `frame-src`, and — more importantly — contradicts the Constitution's
  "Pagos y datos de tarjeta" rule intent of keeping Themora's own pages away from raw
  card entry surfaces; hosted redirect keeps that boundary the cleanest).

## R4: Single source of truth for the price catalog (Principle IV)

**Decision**: Move the `SERVICIOS` price map out of `crear-factura.js` into
`netlify/functions/lib/pagos-catalogo.js`; both `crear-factura.js` (existing, manual
invoices) and the new `pagos-crear-sesion.js` (new, catalog checkout) import the same
module. There is exactly one place in the codebase where "listar = $49.99, formar =
$149.00" is written.

**Rationale**: Constitution Principle IV ("Una sola verdad, probada") forbids the same
figure living in two places. Writing a second, parallel price map for the new
checkout function would silently violate it the moment someone updates one map and
not the other.

**Alternatives considered**:
- Duplicate the map in the new function (rejected outright — the exact failure mode
  Principle IV exists to prevent).
- Move pricing into a Supabase table (rejected for this iteration: no evidence the
  static, rarely-changing catalog needs to be admin-editable yet; would be a
  reasonable follow-up if/when prices change often enough to need it without a code
  deploy).

## R5: Idempotency and duplicate-webhook handling

**Decision**: Every state-changing Stripe call Themora makes (Checkout Session
creation, refund issuance) is sent with a Stripe `Idempotency-Key` header derived
deterministically from the triggering request (e.g. `checkout:{userId}:{servicio}:
{referencia}` for a new session, `refund:{pagoId}:{adminUserId}:{timestamp bucket}`
for a refund attempt). Every inbound webhook event is written to
`public.eventos_pago_webhook` keyed by Stripe's own event id (`evt_...`) as the
primary key *before* any side effect is applied; if the insert hits a conflict, the
event is a duplicate delivery and processing stops there.

**Rationale**: This is the literal mechanism required by the Constitution's new
"Pagos y datos de tarjeta" rule (idempotency keys) and "Código que toca dinero" rule
(duplicate webhook event id never reprocessed), and directly implements spec.md's
FR-007/FR-008 and User Story 5.

**Alternatives considered**:
- De-duplicate in application logic by checking "does a payment with this Stripe id
  already exist" (rejected as the sole mechanism: a race between two near-simultaneous
  deliveries can pass that check twice before either write commits; a unique
  constraint on the event id at the database level closes that race, the application
  check does not).

## R6: Subscriptions as "ready but inactive" infrastructure

**Decision**: Build the full subscription code path (Checkout in `mode: "subscription"`,
webhook handling for `customer.subscription.*` events, Customer Portal subscription
management) but gate any customer-visible "subscribe" entry point behind a single
config row, `public.pagos_config.suscripciones_activas` (boolean, default `false`).

**Rationale**: Directly implements the owner's resolved clarification (FR-002) and
reuses an existing, already-proven pattern in this exact codebase:
`public.tasas_config.activo` gates the mortgage-rate feature the same way — "build it,
prove it works, flip one boolean when there's something real to sell." No new pattern
needed.

**Alternatives considered**:
- A client-side-only flag (like `pago.js`'s `FACTURA_CON_TARJETA`) (rejected as the
  sole gate: subscription webhook processing and portal access must also stay inert
  server-side, not just hidden in the UI, since a determined user could otherwise
  reach a "real" but unlisted subscription checkout).

## R7: Reuse of existing admin/session auth

**Decision**: Every new Netlify function that touches payment data reuses the exact
two auth patterns already in the codebase: `esAdmin(accessToken)` (Supabase
`/auth/v1/user`, checks `app_metadata.is_admin`) for admin endpoints, copied from
`crear-factura.js`/`admin-data.js`; a plain "is there a valid Supabase session"
check for customer-facing endpoints, matching `coach.js`'s pattern. No new auth
system, no new roles.

**Rationale**: Constitution "Evidencia antes de construir" and the owner's resolved
clarification (single `is_admin` tier, no finance-only role, FR-018).

**Alternatives considered**: A dedicated finance-admin role (explicitly rejected by
the owner in the spec clarification).
