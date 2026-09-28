# Feature Specification: Themora Payment Center

**Feature Branch**: `010-themora-payment-center`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Build a production-grade THEMORA PAYMENT CENTER using the existing THEMORA architecture and the officially installed Stripe Claude Code plugin. Modular payment system (Stripe / Security / Testing-QA layers) with customer and admin dashboards, Stripe as payment authority, webhooks as the reliable server-side source of payment state, designed for duplicate events, delayed webhooks, failed API requests, network failures, refunds and payment recovery."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pay for a Themora service online (Priority: P1)

A customer who wants a Themora service (for example, listing a business or forming an
LLC) pays for it directly on the site with a card, instead of waiting for staff to
email a manual invoice.

**Why this priority**: This is the core value of the Payment Center — it replaces the
current fully-manual "admin creates a draft invoice, reviews it, sends it by hand"
flow for standard, catalog-priced services. Without this, nothing else in the Payment
Center has anything to operate on.

**Independent Test**: Can be fully tested by having a signed-in customer choose a
catalog service, complete a Stripe test-mode checkout, and see the payment marked as
paid — without any admin action in between.

**Acceptance Scenarios**:

1. **Given** a signed-in customer viewing a catalog service, **When** they choose to
   pay, **Then** they are taken to a secure Stripe-hosted checkout showing the exact
   price Themora's server has on file for that service.
2. **Given** a customer completes checkout successfully, **When** Stripe confirms the
   charge, **Then** the payment status becomes "paid" and is visible to the customer,
   even if the customer closed the browser tab right after paying.
3. **Given** a customer's card is declined at checkout, **When** the decline happens,
   **Then** the customer sees a clear, honest message and can retry, and no payment
   record is created for the failed attempt beyond a "failed" entry.

---

### User Story 2 - See my own payment history and invoices (Priority: P2)

A customer opens their Themora account and sees every payment, invoice and its status
(paid, pending, failed, refunded) in one place, without asking staff.

**Why this priority**: Directly serves Constitution Principle I (no false promises,
honest status) and Principle II (the account page already exists in `cuenta.html`;
this extends it rather than creating a parallel place to check "did my payment go
through").

**Independent Test**: Can be fully tested by signing in as a customer with at least
one prior payment and confirming the history, invoice links, and status all match
what Stripe shows for that customer.

**Acceptance Scenarios**:

1. **Given** a signed-in customer with past payments, **When** they open their account,
   **Then** they see a list of payments/invoices ordered by date with a plain-language
   status for each.
2. **Given** a customer whose payment failed, **When** they view their history,
   **Then** the failed attempt is shown honestly (not hidden, not shown as "pending"
   forever) with a way to try again.
3. **Given** a customer who has never paid Themora, **When** they open the payment
   section of their account, **Then** they see an empty, honest state — not an error.

---

### User Story 3 - Manage my payment method and subscription (Priority: P3)

A customer with a recurring Themora plan updates their card on file, or cancels/
changes their subscription, without emailing staff.

**Why this priority**: Recurring billing is part of the requested scope but depends on
User Stories 1–2 existing first (a customer must be able to pay and see status before
"manage what I pay for" is meaningful).

**Independent Test**: Can be fully tested by having a subscribed test customer open
"manage my subscription," reach Stripe's Customer Portal, change their card, and
return to Themora with the change reflected.

**Acceptance Scenarios**:

1. **Given** a customer with an active subscription, **When** they choose "manage
   subscription," **Then** they reach a secure portal where they can update their
   card or cancel, without staff involvement.
2. **Given** a customer updates their card in the portal, **When** they return to
   Themora, **Then** their account reflects the new card on file (or at least that a
   card is on file), never the card number itself.
3. **Given** a customer cancels their subscription, **When** the cancellation is
   confirmed by Stripe, **Then** Themora reflects "cancelled" status without the
   customer having to refresh repeatedly or contact staff.

---

### User Story 4 - Run payment operations from the admin panel (Priority: P2)

Themora staff (signed in as admin) search for a customer and see their payments,
subscriptions, invoices, refunds and disputes in one place inside the existing admin
panel (`admin.html`), and can issue a refund without leaving Themora.

**Why this priority**: Staff already have a manual invoice tool in `admin.html`; this
story is what makes the Payment Center actually operable day-to-day once self-service
checkout (US1) exists, so it ranks alongside US1/US2 rather than after them.

**Independent Test**: Can be fully tested by an admin searching for a test customer by
email, viewing their payment/subscription history, and issuing a refund that then
appears in that customer's own history (US2).

**Acceptance Scenarios**:

1. **Given** an admin session, **When** they search by customer email or reference
   number, **Then** they see that customer's payments, invoices, subscriptions,
   refunds and disputes.
2. **Given** an admin viewing a paid, refundable payment, **When** they issue a
   refund, **Then** Stripe processes it and the customer's own history updates to
   "refunded" without further admin steps.
3. **Given** a non-admin session, **When** it tries to reach any admin payment
   endpoint or page, **Then** access is denied the same way `admin.html` and
   `admin-data.js` already deny it today.

---

### User Story 5 - Payment state stays correct when things go wrong (Priority: P1)

Whatever Stripe reports as the truth about a payment, subscription or invoice is what
Themora ends up showing — even when notifications arrive twice, late, out of order, or
not at all on the first try.

**Why this priority**: This is the reliability backbone the other stories depend on.
A Payment Center that shows the wrong status after a hiccup is worse than the current
manual process, which at least has a human double-checking every step.

**Independent Test**: Can be fully tested by replaying the same payment-confirmed
notification twice, sending one out of order after a "refunded" notification, and
simulating a delayed notification — and confirming the customer/admin views always
end up matching Stripe's actual current state, with no duplicate charges or duplicate
history entries.

**Acceptance Scenarios**:

1. **Given** the same payment-confirmation notification is received twice, **When**
   it is processed the second time, **Then** no duplicate payment record, receipt, or
   customer notification is created.
2. **Given** a notification is delayed for several hours, **When** it finally
   arrives, **Then** Themora still updates the record correctly instead of having
   moved on with stale/incorrect status.
3. **Given** Themora's server fails to reach Stripe mid-operation (network error),
   **When** the customer or admin retries the same action, **Then** it does not
   result in two charges, two refunds, or two invoices for one intent.
4. **Given** any of the above recovery events, **When** they occur, **Then** they are
   recorded in a place staff can review (not silently swallowed).

---

### Edge Cases

- What happens when a webhook notification's signature doesn't match Stripe's (a
  forged or corrupted request)? It MUST be rejected and never trusted for state.
- What happens when a customer starts checkout twice for the same service (two open
  tabs)? Only one MUST result in an actual charge.
- What happens when a subscription payment fails and Stripe's automatic retries also
  fail? The customer and admin MUST both see "payment failed" / "past due," not
  "active."
- What happens when a customer disputes a charge with their bank (chargeback) after
  Themora already delivered the service? It MUST show up in the admin dispute view,
  not just in Stripe's own dashboard.
- What happens when a customer deletes their Themora account (existing
  `eliminar-cuenta.js` flow) while they have an active subscription or unresolved
  dispute? The account deletion MUST NOT silently strand an active subscription with
  no one able to manage it.
- What happens when an admin tries to refund a payment that was already fully
  refunded, or a payment that doesn't exist? It MUST be rejected with a clear reason,
  not a duplicate refund attempt.
- What happens when Stripe itself is unreachable or erroring when a customer tries to
  pay? The customer MUST see an honest "try again shortly" message, per Constitution
  Principle III, not a dead end.
- What happens the very first time a given customer ever pays (no Stripe customer
  record yet)? The system MUST create it correctly rather than erroring or creating a
  duplicate on a second attempt.

## Requirements *(mandatory)*

### Functional Requirements

**Stripe / payment flows**

- **FR-001**: System MUST let a signed-in customer pay for a catalog-priced,
  one-time service via a Stripe-hosted checkout, using the price Themora's own server
  holds for that service (never a price supplied by the browser).
- **FR-002**: System MUST build full subscription support (checkout, renewal,
  cancellation, portal management) end-to-end, but MUST NOT expose a "subscribe"
  action to customers until a real recurring plan is defined in the catalog — no
  subscription product exists in Themora's catalog today, so this ships as
  ready-but-inactive infrastructure rather than a launched customer-facing feature.
- **FR-003**: System MUST let a customer view their invoices and download/view them
  the way Stripe presents them (hosted invoice, not re-typed by Themora).
- **FR-004**: System MUST let a customer reach a Stripe Customer Portal session to
  update their payment method and manage/cancel an active subscription.
- **FR-005**: System MUST treat Stripe as the single authority for payment,
  subscription, and invoice status; Themora's own records MUST be a reconciled copy,
  never a competing source of truth.
- **FR-006**: System MUST process Stripe webhook notifications as the mechanism that
  keeps Themora's copy of payment/subscription/invoice state current, including for
  events that happen with no customer present in a browser (delayed payments,
  subscription renewals, bank-initiated disputes).
- **FR-007**: System MUST de-duplicate webhook notifications by event identity, so
  that receiving the same notification more than once never creates a duplicate
  payment record, duplicate refund, or duplicate customer-visible entry.
- **FR-008**: System MUST use an idempotency mechanism for any operation that changes
  money state (charge, refund, subscription change), so that a retried request after a
  network failure cannot double-charge or double-refund.
- **FR-009**: System MUST support Stripe's test mode end-to-end (checkout,
  subscriptions, invoices, refunds, webhooks) so the whole flow can be verified with
  no real money moving, the same way `crear-factura.js` already does via its
  `STRIPE_SECRET_KEY` environment variable.
- **FR-010**: System MUST continue to support the existing admin-authored,
  reviewed-before-sending draft invoice flow (`crear-factura.js`) for bespoke or
  off-catalog charges; the Payment Center MUST NOT remove or bypass that reviewed-
  draft safety step for non-catalog invoices.

**Customer-facing**

- **FR-011**: Customers MUST be able to see, in their existing account page
  (`cuenta.html`), their payment history, invoice list, current subscription (if any),
  and the plain-language status of each (paid, pending, failed, refunded, disputed,
  cancelled).
- **FR-012**: Customers MUST be able to see a failed payment honestly represented
  (not hidden, not mislabeled as pending indefinitely) with a way to retry.
- **FR-013**: Customers MUST NOT see any other customer's payment, invoice, or
  subscription data.

**Admin-facing**

- **FR-014**: Admins MUST be able to search for a customer (by email or Themora
  reference number, matching the pattern already used in `crear-factura.js`) and see
  that customer's payments, invoices, subscriptions, refunds, and disputes together.
- **FR-015**: Admins MUST be able to issue a refund (full or partial) for an eligible
  payment from within Themora, and MUST NOT be able to issue a refund larger than the
  original payment or a second refund exceeding what remains refundable.
- **FR-016**: Admins MUST be able to see a list of webhook events Themora received,
  including any that failed to process, so a missed notification is discoverable
  instead of silent.
- **FR-017**: Admins MUST be able to see disputes (chargebacks) raised against
  Themora's payments.
- **FR-018**: Access to any admin payment view or action, including issuing refunds,
  MUST be denied to a non-admin session the same way `admin.html` / `admin-data.js`
  deny it today, reusing the single existing `app_metadata.is_admin` flag on the
  Supabase session with no separate finance-only permission tier.

**Security & auditability**

- **FR-019**: System MUST NOT store or log raw card numbers, CVCs, or full card data
  anywhere in Themora's own systems (server, logs, or database); only Stripe-hosted
  surfaces MUST ever see raw card data, per the Constitution's "Pagos y datos de
  tarjeta" rule.
- **FR-020**: System MUST verify the authenticity of every webhook notification
  (signature check) before treating it as true payment state, per the Constitution's
  "Pagos y datos de tarjeta" rule.
- **FR-021**: System MUST keep all Stripe API keys and webhook secrets only in
  server-side environment variables, never in client-side code or the repository,
  consistent with how `STRIPE_SECRET_KEY` is already handled in `crear-factura.js`.
- **FR-022**: System MUST record every admin action that changes payment state
  (refund issued, dispute note added, invoice created) in an audit log capturing who,
  when, and what changed, per the Constitution's "Código que toca dinero" rule.
- **FR-023**: System MUST apply a rate limit to customer-facing payment actions
  (starting checkout, retrying payment) to prevent abuse, consistent with how other
  paid/limited functions (e.g. `coach.js`) already apply session/usage limits.
- **FR-024**: System MUST show honest, non-technical error messages to customers when
  a payment action fails for any reason (Stripe outage, network failure, declined
  card), never a raw error or a silent failure, per Constitution Principle I.

**Testing / QA**

- **FR-025**: Every payment-affecting code path (checkout creation, webhook
  handling, refund issuance, subscription changes) MUST have automated tests covering
  at least: the successful case, a duplicate webhook delivery, a failed/declined
  payment, a webhook signature failure, and a downstream Stripe API failure — runnable
  via the project's existing `node --test tests/` pattern.
- **FR-026**: Refund handling MUST be tested for: a full refund, a partial refund,
  and an attempt to over-refund (which MUST be rejected).
- **FR-027**: Subscription handling MUST be tested for: successful renewal, failed
  renewal/past-due, and cancellation.

### Key Entities

- **Themora Customer**: The link between an existing Themora account (Supabase
  auth user) and a Stripe Customer. One Themora account maps to at most one Stripe
  Customer, created the first time that person pays or subscribes.
- **Payment**: A single one-time charge for a catalog service. Has a status (paid,
  failed, refunded, disputed), an amount, a service reference, and a link back to the
  Themora Customer and the originating Stripe object.
- **Subscription**: A recurring plan a Themora Customer is enrolled in. Has a status
  (active, past due, cancelled) and links to the Themora Customer.
- **Invoice**: A Stripe-issued bill, either from a catalog checkout, a subscription
  renewal, or the existing bespoke admin-drafted flow (`crear-factura.js`). Has a
  status and an amount due/paid.
- **Refund**: A reversal of all or part of a Payment, with who issued it and when.
- **Dispute**: A chargeback raised by a customer's bank against a Payment.
- **Webhook Event**: A record of a Stripe notification Themora received, keyed by its
  unique event identity, used both to prevent double-processing and to give admins a
  list of what happened (including failures).
- **Audit Log Entry**: A record of an admin action that changed payment state — who,
  when, what.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can go from "choose a service" to "payment confirmed" in
  under 3 minutes without contacting staff.
- **SC-002**: A completed payment appears correctly in the customer's own payment
  history within 60 seconds of Stripe confirming it, even if the customer never
  returns to the browser tab used to pay.
- **SC-003**: The same payment notification delivered more than once never produces
  more than one visible payment record, one charge, or one customer notification.
- **SC-004**: 100% of failed, delayed, or duplicate payment notifications are
  discoverable by an admin afterward (none are silently lost).
- **SC-005**: An admin can find any customer's full payment picture (payments,
  invoices, subscriptions, refunds, disputes) via search in under 15 seconds.
- **SC-006**: A refund issued by an admin is reflected in the customer's own history
  within 2 minutes, with zero cases of a refund exceeding the original payment.
- **SC-007**: Zero instances, across all logs and databases, of a raw card number or
  CVC ever being stored by Themora's own systems.
- **SC-008**: 100% of admin actions that change payment state have a matching audit
  log entry.
- **SC-009**: The entire payment flow (checkout, webhook processing, refunds,
  subscriptions) can be exercised and verified with Stripe test mode without moving
  real money, before anything reaches Stripe live mode.

## Assumptions

- Themora's existing Supabase-based account system (`auth.js`, `cuenta.html`,
  `login.html`) is reused as-is for customer identity; the Payment Center adds a
  Stripe Customer link to that identity rather than building a separate login.
- The existing `app_metadata.is_admin` flag (already used by `admin.html` and
  `admin-data.js`) is reused as-is for all Payment Center admin access, including
  refunds — no separate finance-only permission tier.
- The existing manual, admin-reviewed draft-invoice tool (`crear-factura.js`) is kept
  for bespoke/off-catalog charges and is not replaced; the Payment Center is additive
  for catalog-priced, self-service purchases. Subscription support ships as
  ready-but-inactive infrastructure until a recurring product is added to the catalog.
- Customer- and admin-facing Payment Center screens are Spanish-only, consistent with
  the rest of the transactional site (`cuenta.html`, `admin.html`); Constitution
  Principle V's four-language requirement applies to Zyron's conversational answers,
  not to transactional payment UI.
- "Stripe test mode" is controlled the same way it is today: which `STRIPE_SECRET_KEY`
  (test or live) is set in Netlify's environment variables, not a runtime toggle
  exposed in the UI.
- Data retention for payment/webhook/audit records follows Stripe's own retention as
  the source of truth; Themora's local copy is kept only as long as needed to power
  the customer/admin views described here.
- Mobile and desktop web are both in scope, consistent with the rest of the site;
  no native app exists or is assumed.
