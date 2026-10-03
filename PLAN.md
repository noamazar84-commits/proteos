# Proteus roadmap

1. **Product surface — done:** landing page, Google sign-in entry, three weight-loss pathways, 30-day plan dashboard, protein targets and meal builder, and monthly check-in.
2. **Authentication — implemented; credentials/E2E pending:** Google Identity Services ID-token verification, nonce validation, verified-email account linking, and persistent server sessions. The owner admin allowlist is `noamazar84@gmail.com`.
3. **Customer and billing data — implemented:** managed MySQL/Drizzle tables for customers, sessions, and Whop webhook event idempotency. The owner-only CRM reads live customer records and calculates trial day 1–7, dates, renewal, and subscription state. Plans/check-ins still live in browser storage.
4. **Whop subscription flow — implemented; environment setup/E2E pending:** official React checkout embed, verified-email prefill, explicit sandbox/production environment, browser-origin return URL, signed v1 webhook verification, duplicate protection, and server-backed app access. Configure matching recurring `$19.90/month` plans with a 7-day trial in both Whop environments.
5. **Validation — pending protected inputs:** configure Development (`sandbox`) and Production (`production`) Google/Whop settings via the secure input flow, register matching webhook endpoints, and test a sandbox sign-in/trial/payment lifecycle. Do not test with a live charge.
6. **Deployment — paused:** hybrid static + Node SSR/API build configuration is prepared. Auto-publish is currently enabled in the bound project configuration; no publish or checkpoint that could trigger a deployment is permitted without the user's fresh explicit approval.
7. **Out of scope:** WhatsApp login and email automation. Do not add them without a new user request.
