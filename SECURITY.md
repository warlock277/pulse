# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**.
Instead, use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
("Report a vulnerability" under the repository **Security** tab), or contact a
maintainer directly. We aim to acknowledge reports within 72 hours.

## Handling secrets

Pulse never stores secrets in the repository. Tokens and API keys are referenced
in `pulse.config.yaml` as `${ENV_VAR}` placeholders and supplied at runtime as
**GitHub Actions secrets**. The engine never logs secret values and skips any
channel whose `${...}` placeholders are unresolved. Keep your monitoring repo
**private** if any monitored endpoint, header, or result is sensitive.

## Data privacy & access control

Client-side role filtering in the dashboard is a **UX convenience, not a
security boundary**. The real boundary is:

1. A **private** GitHub repository for the monitoring data, and
2. **Cloudflare Access** in front of the dashboard (Google / GitHub / email OTP).

See [`docs/access-control.md`](docs/access-control.md) for the full model.

## Dependency advisories

`npm audit` may report findings in **development-only** tooling — specifically
the Vite dev server and its bundled `esbuild` (advisories that apply only when
`vite dev` is run on an untrusted network). These tools are **not** part of the
production build: the dashboard ships to Cloudflare Pages as pre-built static
assets with no dev server. Production runtime dependencies are kept advisory-free.
