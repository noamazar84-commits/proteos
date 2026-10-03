# Proteus

Proteus is a protein-first weight-loss planning app with GLP-1, bariatric/sleeve, and general weight-loss pathways. Users can build a 30-day plan, set protein targets, assemble meals, and check in monthly.

## Stack

TanStack Start, React 19, TanStack Router, Vite 7, and Tailwind CSS 4 form the application stack. Drizzle ORM and managed MySQL persist Google-verified customers, sessions, subscription status, and webhook idempotency. Authentication uses Google Identity Services with server-side ID-token verification and persistent server sessions. Billing uses Whop's official `@whop/checkout` React embed and signed Standard Webhooks v1 events.

## Local development and validation

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm build
```

`pnpm dev` runs migrations and starts Vite on port 3000. The Webdev hybrid build uses `pnpm build` plus `node scripts/prerender-static-shell.mjs`, serves assets from `dist/client`, and routes app/API requests to the Node server.

## Protected environment configuration

For the bound Webdev project, configure protected values through Manus's secure input flow; never commit them in `.env` or share them in chat.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Managed MySQL connection (Webdev provisions this when its database capability is enabled). |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID used by the server to verify ID-token audience. Add both the Preview and Production HTTPS origins/redirect settings to the Google OAuth client. |
| `WHOP_PLAN_ID` | A Whop `plan_...` ID. Use a sandbox plan for Preview and a production plan for Live. |
| `WHOP_CHECKOUT_ENVIRONMENT` | `sandbox` for Development/Preview; `production` for Production/Live. Set explicitly—there is no unsafe default. |
| `WHOP_WEBHOOK_SECRET` | The endpoint-specific Whop Standard Webhooks signing secret exactly as issued (`ws_...`). Keep Development and Production webhook endpoints/secrets separate. |
| `WHOP_MANAGE_URL` | Optional secure HTTPS Whop billing-management URL exposed in Account Settings for direct cancellation. |

Configure the Whop plan as the single recurring Proteus plan at **$19.90/month with a 7-day free trial**. The app embeds Whop checkout only for a signed-in, Google-verified customer; the server pre-fills and locks the verified account email, and the browser-facing origin supplies the return URL so Preview and Live do not use an internal proxy host. A browser redirect is not proof of payment: app access opens only after a valid signed webhook updates the database.

Register `POST /api/webhooks/payment` in Whop v1 and subscribe to the relevant current lifecycle and payment events, including `membership.activated`, `membership.deactivated`, `membership.cancel_at_period_end_changed`, `payment.succeeded`, and `payment.failed`. The handler verifies `webhook-id`, `webhook-timestamp`, and `webhook-signature`, rejects stale/invalid signatures, and uses `webhook-id` for idempotency.

## Owner CRM and scope

`/admin` and its API are restricted server-side to an email-verified session created by a single-use code sent to an authorized owner address. Codes expire after 10 minutes and are never stored in plaintext. The CRM shows registered users, personal/profile details, the single plan, exact trial day (1–7), join/trial/payment dates, renewal date, and status. The public header shows the Admin link only to an authorized owner.

WhatsApp login, SMS/text messaging, push notifications, marketing automation, behavioral analytics, and biometric scanning are intentionally out of scope. Plan and check-in data remains in browser storage; customer identity and billing state are persisted in MySQL. New accounts require an adult (18+) confirmation. Account deletion is available in `/app/settings`; active Whop billing must be canceled with Whop first, and the optional `WHOP_MANAGE_URL` exposes the provider's secure billing controls in that screen.

## Deployment safety

The bound Webdev project is configured for hybrid static + Node SSR/API deployment. Do not publish or save a checkpoint that could trigger Auto-publish without fresh explicit user approval. Local code/build verification does not itself publish the application.

The permanent deployment uses the managed Webdev server and database capabilities, with static assets built from `dist/client` and SSR/API requests served by the Node runtime.
