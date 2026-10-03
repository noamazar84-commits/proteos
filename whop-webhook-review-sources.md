# Whop webhook review sources

Reviewed 2026-09-29 while drafting `whop-webhook-high-priority.patch`. These are reference notes, not deployment configuration.

- [Whop Webhooks guide](https://docs.whop.com/developer/guides/webhooks): documents the v1 signing secret/HMAC verification flow, timestamp freshness, unique webhook IDs for idempotency, and retry behavior for non-success responses.
- [Whop Webhook resource](https://docs.whop.com/api-reference/webhooks/webhook): lists supported event types, including `membership.activated`, `membership.deactivated`, `membership.cancel_at_period_end_changed`, `payment.succeeded`, and `payment.failed`; webhook API versions include v1 and legacy versions.
- [Whop Membership resource](https://docs.whop.com/api-reference/memberships/membership): lists lifecycle status values including `trialing`, `active`, `past_due`, `canceled`, and `expired`; the resource includes the plan, current billing-period start/end, and cancel-at-period-end state. The draft extracts the plan ID to enforce a server-side allowlist.
- [Whop Payment resource](https://docs.whop.com/api-reference/payments/payment): describes payment totals as numeric amounts in the payment's currency and associates payments with a membership. This was separately flagged for follow-up because the current normalizer only recognizes `_cents` fields.

The patch treats events for a different explicit plan as acknowledged-but-ignored, rejects processable events without a plan ID using a retryable response, and rolls back the idempotency insert when a signed event has no matching customer so Whop can retry it. The retry strategy depends on Whop's documented retry window; durable dead-letter storage/reconciliation remains a possible follow-up for events still unmatched when that window ends.
