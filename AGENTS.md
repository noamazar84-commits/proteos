# AGENTS.md

Proteus is a TanStack Start weight-loss planning app. Continue from the current hybrid SSR/API implementation; do not restore the previous Netlify Identity, static checkout-link, mock-auth, Stripe, or Woovi flows.

## Current architecture

- `src/routes/index.tsx`: landing page and sign-in entry point. `src/components/SiteNav.tsx` shows **Admin** only for a server-verified Google account whose email is `noamazar84@gmail.com`.
- `src/routes/api.auth.google.ts`: verifies Google Identity Services ID tokens server-side, checks the nonce, and creates/links a customer and persistent session. `src/lib/server/session.ts` owns signed/opaque session cookies and database lookup.
- `db/schema.ts`, `db/index.ts`, and `db/migrations/`: managed MySQL customer, session, and Whop webhook idempotency tables. Google-verified profiles and billing/trial fields are server-persisted.
- `src/components/TrialGate.tsx`: checks `/api/subscription`; the server subscription state controls app access. The authenticated, verified email is prefilled and disabled in the official `@whop/checkout` embed. A browser return/completion is never treated as payment proof.
- `src/routes/api.billing.checkout.ts`: returns the server-configured plan, explicit checkout environment, and verified email. The checkout component builds `/app?billing=return` from the browser-facing origin so the proxy's internal host is never used. Preview must use `WHOP_CHECKOUT_ENVIRONMENT=sandbox` with a sandbox plan; Production must use `production` with a production plan.
- `src/lib/server/whop.ts` and `src/routes/api.webhooks.payment.ts`: verify Whop Standard Webhooks v1 signatures over the raw body using the `ws_...` secret, normalize lifecycle/payment events, and persist idempotency by `webhook-id` before updating customer billing state.
- `src/routes/admin.tsx` and `src/routes/api.admin.subscriptions.ts`: live, owner-only CRM and API. The server checks the verified email allowlist; the CRM reports profile/pathway details, the single plan, exact day 1–7, join/trial/payment/renewal dates, and integration readiness without revealing credentials.
- `src/lib/store.ts`: user-specific plans and check-ins remain browser-local for now; do not claim they are database-backed.
- `scripts/prerender-static-shell.mjs`, `server.mjs`, and `Dockerfile`: hybrid static assets plus Node SSR/API deployment. `pnpm typecheck` and `pnpm build` are the local validation commands.

## Product and security constraints

- Admin allowlist is fixed to `noamazar84@gmail.com`; do not add client-entered email as an authorization check. Both page visibility and server APIs must require the verified Google session.
- Billing is one recurring Proteus plan at `$19.90/month` with a 7-day free trial. The Whop plan itself must be configured to match. Subscription access changes only after valid, signed server webhook processing.
- Keep WhatsApp login and email automation out of scope.
- Never ask for or echo secret values in chat. Request new/replacement protected values only with `webdev.request_secrets`; do not inspect or copy stored secrets. Keep Development and Production values environment-scoped (especially sandbox/production plan IDs and webhook secrets).
- Never publish or trigger a deployment without fresh explicit user approval. Before any checkpoint, read the bound Webdev config and ensure the user's Auto-publish restriction is respected; do not assume that local builds or a saved checkpoint are harmless.
- Before adding a new external service, inspect current connector/config availability. Do not change production billing, customer, or account-security settings without the user's authority.

## Product boundaries and app behavior

- `src/routes/app.tsx` is the signed-in app shell. `src/routes/app.index.tsx` selects pathway setup; `src/routes/app.plan.tsx`, `src/routes/app.protein.tsx`, and `src/routes/app.check-in.tsx` provide the planning tools.
- `src/lib/fixtures.ts` holds pathways and meal content. `src/lib/engine.ts` remains a pure plan generator.
- Do not add WhatsApp flows, email campaigns, reminders, or other automation without a new request.
