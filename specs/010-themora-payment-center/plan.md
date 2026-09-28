# Implementation Plan: Themora Payment Center

**Branch**: `010-themora-payment-center` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-themora-payment-center/spec.md`

## Summary

Extend Themora's existing, hand-run Stripe invoicing (`crear-factura.js`, `pago.js`)
into a self-service Payment Center for the two fixed-price catalog services
(`listar`, `formar`): once staff confirm eligibility/price in writing through the
existing "Pedir mi presupuesto" flow (unchanged) and mark that specific request
approved (`admin-pagos.js`'s `aprobarPago`), the customer pays it via Stripe-hosted
Checkout from their own account with no further admin step. Stripe webhooks are the
single source of truth reconciled into new Supabase tables,
customers see their own history/portal in `cuenta.html`, and admins get a search +
refund + dispute + webhook-event + audit view added to `admin.html`. Bespoke,
off-catalog invoicing keeps today's fully manual, admin-reviewed-and-sent flow
unchanged. Subscriptions are built end-to-end but stay invisible until a real
recurring plan exists (`pagos_config.suscripciones_activas`). No new dependency, no
build step, no framework — every new Netlify function follows the same raw-`fetch`-
to-Stripe-REST style already used in `crear-factura.js`.

## Technical Context

**Language/Version**: JavaScript (CommonJS), Node.js — Netlify Functions runtime,
matching every existing file in `netlify/functions/`. No TypeScript, no transpile
step.

**Primary Dependencies**: None added. Stripe reached via built-in `fetch` +
`application/x-www-form-urlencoded` (research.md R2); webhook signatures verified
with Node's built-in `crypto` (HMAC-SHA256). Front end uses the site's existing
vanilla JS/CSS, no new client library.

**Storage**: Supabase Postgres (existing project). New tables:
`themora_clientes_stripe`, `pagos`, `suscripciones`, `reembolsos`, `disputas`,
`eventos_pago_webhook`, `auditoria_pagos`, `pagos_config` — see data-model.md.

**Testing**: `node --test tests/` (Node's built-in test runner), matching every
existing `tests/*.test.js` file. No Jest/Mocha introduced.

**Target Platform**: Netlify (static HTML/CSS/JS + `netlify/functions/`, no build
step — `publish = "."` in `netlify.toml`) + Supabase (Postgres + Auth), reached from
evergreen browsers (same as the rest of the site).

**Project Type**: Existing flat static-site-plus-serverless-functions structure
(not a frontend/backend split repo) — this feature adds files into that same layout,
it does not introduce a new project shape.

**Performance Goals**: Interactive endpoints (`pagos-crear-sesion`, `pagos-portal`,
`pagos-historial`) respond within the same few-hundred-ms-to-low-seconds range as
existing functions like `coach.js`/`admin-data.js`. Webhook processing
(`pagos-webhook`) MUST complete well inside Stripe's ~10s delivery timeout to avoid
triggering Stripe's own retry storm on top of Themora's own idempotency handling.

**Constraints**: No raw card data ever reaches Themora's servers (Constitution
"Pagos y datos de tarjeta"); all Stripe/webhook secrets stay in Netlify environment
variables (existing "Secretos fuera del código" rule, extended); files stay LF; no
new framework/dependency without evidence the existing approach is insufficient
(none found — see research.md R2/R4).

**Scale/Scope**: Small-business transaction volume (tens to low hundreds of
payments/month), consistent with Themora's current single-owner-operated scale — not
designed against enterprise-scale throughput targets.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|---|---|---|
| Principle I — Honestidad y no asesoría | PASS | Payment/refund status always reflects Stripe's actual state (FR-005, FR-012, FR-024); no promised outcome beyond what's true; error messages are honest, not technical dumps. |
| Principle II — Privacidad por diseño | PASS | Card data never touches Themora (hosted Checkout/Portal); analytics events for the new "Pagos" UI MUST log only categorical stage names (e.g. `pago_iniciado`, `pago_completado`), never amounts/emails, matching the existing Umami convention. Account deletion (`eliminar-cuenta.js`) interaction with an active subscription is called out as an Edge Case in spec.md — resolved during implementation by requiring cancellation-or-explicit-confirmation before delete completes, not silently orphaning a subscription. |
| Principle III — Funciona sin IA | N/A | No AI-assisted path in this feature. |
| Principle IV — Una sola verdad, probada | PASS | Price catalog has exactly one home (`pagos-catalogo.js`, shared by `crear-factura.js` and `pagos-crear-sesion.js` — research.md R4); Stripe is the sole authority for payment/subscription/invoice state, Supabase is a reconciled copy only (data-model.md). |
| Principle V — Multilingüe con revisión humana | N/A (justified) | Payment Center UI is Spanish-only, consistent with `cuenta.html`/`admin.html` today; Principle V's four-language requirement is scoped to Zyron's conversational answers (spec.md Assumptions). |
| Sitio estático sin paso de compilación / sin dependencia nueva | PASS | No `package.json`, no `stripe` npm package added (research.md R2). |
| Todo lo que está en la raíz se publica | PASS | No new top-level doc files — `INSTRUCCIONES-PAGOS.md` (already blocked in `netlify.toml`) is updated in place; `specs/*` and `.specify/*` already 404 via existing wildcard redirects. |
| Secretos fuera del código | PASS | `STRIPE_SECRET_KEY` (existing) + new `STRIPE_WEBHOOK_SECRET`, both Netlify env vars only. |
| Pagos y datos de tarjeta (new) | PASS | Hosted Checkout/Portal only (research.md R3); webhook signature verified before trust (contracts/pagos-webhook.md); idempotency keys on every state-changing Stripe call (research.md R5). |
| Seguridad del navegador (CSP) | PASS | No CSP change needed — redirect-based flow, not embedded (research.md R3). |
| Formato de archivos LF | PASS | All new files authored as LF, per existing repo convention. |
| Documentación junto al cambio | PASS (action required in tasks) | `INSTRUCCIONES-PAGOS.md` MUST be updated to describe the new catalog self-checkout path and its own env var (`STRIPE_WEBHOOK_SECRET`) before either `pago.js`'s `PAGO_AUTOMATICO_CATALOGO` flag or the `cuenta.html` "Pagos" tab is turned on for real customers. |
| Pruebas | PASS | `node --test tests/` coverage planned per contract (FR-025–027); see each `contracts/*.md` Tests section. |
| Grafo de conocimiento | PASS (action required post-implementation) | `graphify update .` after code lands, per existing project convention. |
| Código que toca dinero (new) | PASS | Duplicate-webhook, failed-payment, signature-failure, and API-failure tests specified per contract; every refund produces an `auditoria_pagos` row (FR-022, contracts/admin-pagos.md). |

**Post-Phase-1 re-check**: All gates above were re-evaluated against the completed
data-model.md/contracts/quickstart.md and remain PASS. No new violations introduced
by the design; no entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-themora-payment-center/
├── plan.md              # This file
├── research.md           # Phase 0 output
├── data-model.md          # Phase 1 output
├── quickstart.md          # Phase 1 output
├── contracts/              # Phase 1 output
│   ├── pagos-crear-sesion.md
│   ├── pagos-webhook.md
│   ├── pagos-historial.md
│   ├── pagos-portal.md
│   └── admin-pagos.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

This feature adds files into Themora's existing flat structure — no new top-level
project, no frontend/backend split. Concrete paths:

```text
netlify/functions/
├── lib/
│   ├── pagos-catalogo.js      # NEW — SERVICIOS moved here, single source of truth
│   │                          #       (imported by crear-factura.js AND the new
│   │                          #       checkout function — research.md R4)
│   └── pagos-stripe.js        # NEW — shared Stripe REST helper (fetch/form-encode/
│                              #       esAdmin-style session check), extracted from
│                              #       crear-factura.js, reused by all functions below
├── crear-factura.js           # UNCHANGED in behavior; refactored to import
│                              #   pagos-catalogo.js / pagos-stripe.js instead of
│                              #   its own inline copies
├── pagos-crear-sesion.js      # NEW — contracts/pagos-crear-sesion.md
├── pagos-webhook.js           # NEW — contracts/pagos-webhook.md
├── pagos-historial.js         # NEW — contracts/pagos-historial.md
├── pagos-portal.js            # NEW — contracts/pagos-portal.md
└── admin-pagos.js             # NEW — contracts/admin-pagos.md

cuenta.html                    # EXTENDED — new "Pagos" section/tab: history,
                                #   invoices, subscription status, manage-payment-
                                #   method/subscription buttons, AND a "Pagar ahora"
                                #   button that appears only for that customer's own
                                #   admin-approved-and-unpaid item(s) (data-model.md
                                #   "Approval precondition" — NOT a public checkout
                                #   button on the marketing pages)
admin.html                     # EXTENDED — new "Pagos" panel: aprobarPago (mark an
                                #   already-quoted-and-confirmed customer request as
                                #   payable), search, refund, disputes, webhook
                                #   events, audit log — alongside the existing,
                                #   untouched facturas() manual-invoice tool
listar-negocio.html,
formar-negocio.html             # UNCHANGED — "Pedir mi presupuesto" and staff's
                                #   written eligibility/price confirmation stay
                                #   exactly as they are today; no pay button added
                                #   here (resolved with the owner during planning —
                                #   see data-model.md)

supabase-schema.sql            # EXTENDED — appends the 8 new tables from
                                #   data-model.md, following the file's existing
                                #   section-by-section append convention

INSTRUCCIONES-PAGOS.md         # EXTENDED — new steps for STRIPE_WEBHOOK_SECRET,
                                #   the Stripe Dashboard webhook endpoint, and how
                                #   the catalog self-checkout path differs from the
                                #   existing manual-invoice steps already documented

tests/
├── pagos-crear-sesion.test.js  # NEW
├── pagos-webhook.test.js       # NEW
├── pagos-historial.test.js     # NEW
├── pagos-portal.test.js        # NEW
└── admin-pagos.test.js         # NEW
```

**Structure Decision**: Additive-only within the existing flat repository layout.
Every new server-side path lives in `netlify/functions/` (with a new `lib/`
subfolder for the two pieces of logic now shared between old and new code); every
new UI lives inside the two existing account/admin pages rather than new standalone
pages, since both already exist and already serve the exact audiences (customer,
admin) this feature targets; the one new top-level script (`pago.js`'s existing file,
extended) needs no new `netlify.toml` redirect since it isn't a new top-level
document.

## Complexity Tracking

No Constitution Check violations — table intentionally left empty.
