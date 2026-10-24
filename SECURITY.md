# Security Policy

Pezcado is a portfolio and demonstration project, not a production-ready
commerce platform. Do not use it to process real payments or sensitive
production data without an independent security review and additional
operational controls.

## Reporting a vulnerability

Please do not report security vulnerabilities in a public issue or pull request.
Use GitHub's **Report a vulnerability** feature for this repository to send a
private report. If that feature is unavailable, contact the repository
maintainer privately through a contact method listed on their GitHub profile.

Include, when possible:

- The affected route, component, or dependency.
- The impact and conditions needed to reproduce the issue.
- A minimal proof of concept that does not access or modify another person's
  data.
- Any suggested mitigation.

Do not include real credentials, payment details, personal data, or other
secrets. Please allow the maintainer reasonable time to investigate and release
a fix before publicly disclosing the issue. There is no guaranteed response or
remediation SLA.

## Supported versions

Only the current default branch is considered for security fixes. Older commits,
deployments, and third-party forks may not receive updates.

## Existing security controls

The current implementation includes:

- Server-side validation of credentials and API inputs with Zod.
- Password hashing with bcrypt and NextAuth JWT sessions.
- Authorization checks for account and administrator operations; new accounts
  receive the regular-user role.
- Session invalidation through the account authentication version after
  sensitive account or administrator changes.
- Server-side product and price lookup when creating Stripe Checkout sessions.
- Stripe webhook signature verification before marking an order as paid.
- Request limits for credential login and chat backed by PostgreSQL. Login is
  limited per email and, when trusted proxy IP headers are enabled, additionally
  per email/IP pair. Chat is limited per client IP.
- Optional page metrics only after consent; metrics are aggregated by day and
  path without visitor identifiers.
- Dependency auditing and CodeQL analysis in GitHub Actions.

These controls reduce specific risks; they are not a security guarantee.

## Deployment requirements and limitations

- Keep `.env`, database URLs, `AUTH_SECRET`, Stripe secrets, OAuth secrets, and
  provider API keys private. Never expose server credentials with a
  `NEXT_PUBLIC_` prefix.
- Use HTTPS in public deployments. Set `NEXTAUTH_URL` and
  `NEXT_PUBLIC_APP_URL` to the canonical public origin.
- Set `TRUST_PROXY_IP_HEADERS=true` only when the application can only be
  reached through a trusted proxy that overwrites `X-Real-IP` or
  `X-Forwarded-For`. The application ignores these headers by default.
- Apply Prisma migrations before deploying code that depends on new database
  tables or columns. In particular, request limiting requires the
  `RateLimitBucket` migration.
- The PostgreSQL-backed limiter uses fixed windows. Around a window boundary it
  can allow more requests than the nominal limit. It is not a substitute for
  broader abuse prevention, bot detection, or infrastructure-level controls.
- Run `npm run orders:cleanup-pending` on a trusted scheduler if the deployment
  should remove pending orders older than 24 hours. The application does not
  schedule this task itself.
- Stripe integration is restricted to test-mode keys. Do not configure live
  payment credentials.
- Legal pages are drafts and must be reviewed and completed before commercial
  use.

See [README.md](./README.md) for setup, environment variables, testing, and
deployment instructions.
