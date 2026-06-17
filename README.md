<div align="center">

# ⚡ Pulse

### Free, serverless uptime monitoring & status pages — powered by GitHub Actions.
**$0/month. No database. No servers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)
[![Deploys to Cloudflare Pages](https://img.shields.io/badge/deploys%20to-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](docs/deployment.md)
[![Powered by GitHub Actions](https://img.shields.io/badge/powered%20by-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/monitor.yml)
[![Cost](https://img.shields.io/badge/cost-%240%2Fmonth-22c55e.svg)](docs/faq.md)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=nodedotjs&logoColor=white)](.nvmrc)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-22c55e.svg)](CONTRIBUTING.md)
![Stars](https://img.shields.io/badge/⭐-star%20if%20useful-yellow.svg)

[Quick start](#-quick-start) · [Docs](docs/) · [Configuration](docs/configuration.md) · [Deploy](docs/deployment.md) · [FAQ](docs/faq.md)

</div>

---

Pulse monitors your websites, APIs, TLS certificates, and domains from
**GitHub Actions**, commits the results as JSON into your repo (that's the whole
database), and serves a beautiful **React status page + admin dashboard** from
**Cloudflare Pages**. Built for agencies and teams: multi-tenant groups, RBAC,
and client-scoped dashboards out of the box.

## ✨ Features

- 🆓 **Truly $0/month** — runs entirely on free tiers. No database, no VM, no cron host.
- 🌍 **External monitoring** every 5 minutes from GitHub's network.
- 🔎 **Rich checks** — HTTP status, keyword present/absent, **JSON-body assertions**, raw **TCP** ports, **TLS cert** expiry, and **domain** expiry.
- ⚡ **Fast, static dashboard** — React + Vite SPA with 24h / 7d / 30d / 90d graphs and incident history.
- 🏢 **Multi-tenant** — group sites by client/product/region.
- 🔐 **RBAC + Cloudflare Access** — `SUPER_ADMIN` / `ADMIN` / `CLIENT` / `VIEWER`, with client-scoped views.
- 🔔 **Notifications** — Telegram, Email (Resend), Discord, Slack, and a generic webhook, with per-channel routing + flapping suppression.
- 🗂️ **Git is the database** — every status change is a diffable, revertible commit.
- 🎨 **White-label ready** — your name, colors, logo on a custom domain.
- 🧩 **One typed config** — a single `pulse.config.yaml`, validated against shared TypeScript types.

## 🖼️ Screenshots

> _Placeholders — drop real screenshots into [`docs/assets/`](docs/assets/) and update these links._

| Status page | Admin dashboard | Site detail |
|---|---|---|
| ![Status page](docs/assets/status-page.png) | ![Dashboard](docs/assets/dashboard.png) | ![Site detail](docs/assets/site-detail.png) |

## 🏗️ Architecture

```mermaid
flowchart TD
    CFG[pulse.config.yaml] --> GA

    subgraph GA["GitHub Actions · cron */5 * * * *"]
        ENGINE["@pulse/engine — probe sites<br/>HTTP · TCP · SSL · domain"]
    end

    ENGINE -->|commit JSON| DATA[("/data<br/>summary · history · incidents · state")]
    ENGINE -->|alerts| NOTIFY["Telegram · Email · Discord<br/>Slack · webhook"]

    DATA -->|push to main| DEPLOY["GitHub Actions · deploy.yml<br/>build dashboard + copy /data"]
    DEPLOY --> PAGES["Cloudflare Pages — static SPA"]
    PAGES --> ACCESS["Cloudflare Access — auth at the edge"]
    ACCESS --> USERS["Users · status page · admin dashboard"]
```

<details>
<summary>ASCII fallback</summary>

```
pulse.config.yaml
      │
      ▼
GitHub Actions (every 5 min) ── @pulse/engine probes sites
      │                                   │
   commit JSON                       send alerts → Telegram/Email/Discord/Slack/webhook
      ▼
  /data (JSON in repo) ── summary · history/<id> · incidents · state · permissions
      │  push to main
      ▼
GitHub Actions (deploy.yml) ── build dashboard + copy /data
      ▼
Cloudflare Pages (static SPA)
      ▼
Cloudflare Access (auth at the edge)
      ▼
Users · status page · admin dashboard
```

</details>

Full write-up: [docs/architecture.md](docs/architecture.md).

## 🚀 Quick start

```bash
# 1. Use this template → create your repo → clone it, then:
npm install

# 2. Generate your config interactively (brand, sites, channels)
npm run setup

# 3. Preview locally with realistic demo data
npm run seed && npm run dev      # → http://localhost:5173

# 4. Add GitHub secrets for your channels (+ Cloudflare), enable Actions
#    See docs/deployment.md

# 5. Connect Cloudflare Pages and push → you're live 🎉
```

That's it. The `monitor` workflow starts probing on its 5-minute cron; the
`deploy` workflow ships the dashboard whenever data or the UI changes.

> Handy commands: `npm run monitor:dry` (validate config, no alerts/commits) ·
> `npm run build` (build dashboard) · `npm run typecheck` · `npm test`.

## ⚙️ Configuration

Everything lives in one file, `pulse.config.yaml`:

```yaml
version: 1
brand:
  name: Pulse
  primaryColor: "#22c55e"
sites:
  - name: My Site
    url: https://example.com
    ssl: true            # watch TLS cert expiry
    domain: true         # watch domain expiry
  - name: My API
    url: https://api.example.com/health
    expectedStatus: 200
    keyword: "ok"        # body must contain "ok"
    expectJson:
      - path: "db.connected"
        equals: true
channels:
  - id: telegram-main
    type: telegram
    botToken: ${TELEGRAM_BOT_TOKEN}   # secret via GitHub Actions
    chatId: ${TELEGRAM_CHAT_ID}
    events: [down, up, ssl, domain]
```

Full reference (every field, every check type, every channel):
**[docs/configuration.md](docs/configuration.md)**. A complete annotated example
lives at [`config/pulse.config.example.yaml`](config/pulse.config.example.yaml).

## 🔔 Notifications

Five channels, each with `events` / `sites` / `groups` filters and
`minDownMinutes` flap suppression:

| Channel | Secret(s) |
|---------|-----------|
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |
| Email (Resend) | `RESEND_API_KEY` |
| Discord | `DISCORD_WEBHOOK_URL` |
| Slack | `SLACK_WEBHOOK_URL` |
| Generic webhook | your URL |

Setup for each (BotFather, Resend domain verification, webhooks) + the generic
payload shape: **[docs/notifications.md](docs/notifications.md)**.

## 🔐 Access control

Four roles — **`SUPER_ADMIN` · `ADMIN` · `CLIENT` · `VIEWER`** — defined in
`data/permissions.json` and enforced at the edge by **Cloudflare Access**
(Google / GitHub / email OTP). Clients see only their own groups and sites.

> 🔒 Client-side filtering is UX only — real privacy = **private repo** +
> **Cloudflare Access**. Details: **[docs/access-control.md](docs/access-control.md)**.

## 📊 How it works

1. **Probe** — every 5 min, `@pulse/engine` checks each site on GitHub Actions.
2. **Store** — results are committed as JSON under `/data` (no database).
3. **Notify** — state changes fan out to your channels.
4. **Deploy** — a push to `main` rebuilds the dashboard and ships it to Cloudflare
   Pages, with `/data` copied into the build.
5. **View** — users hit a static, fast status page behind Cloudflare Access.

Shared types in [`packages/shared/src/types.ts`](packages/shared/src/types.ts)
keep the engine (writer) and dashboard (reader) in lockstep.

## 📈 Scaling limits

GitHub's free runners + the 5-minute cron set practical limits:

| Sites | Recommended interval |
|-------|----------------------|
| ≤ 20  | 5 min                |
| ≤ 50  | 10 min               |
| ≤ 100 | 15 min               |

Need more? Increase the interval, shard across repos, or use a self-hosted
runner. (Actions minutes are **unlimited on public repos**.)

## 🆚 Pulse vs Upptime vs Uptime Kuma

| | **Pulse** | Upptime | Uptime Kuma |
|---|:---:|:---:|:---:|
| Hosting model | GitHub Actions + Cloudflare Pages | GitHub Actions + Pages | **Self-hosted server** |
| Needs a server | ❌ | ❌ | ✅ |
| Cost | **$0** | $0 | Server cost |
| Multi-tenant groups | ✅ | ❌ | ⚠️ |
| RBAC (roles) | ✅ (4 roles) | ❌ | ⚠️ single admin |
| Client-scoped dashboards | ✅ | ❌ | ❌ |
| Edge auth (Cloudflare Access) | ✅ | ❌ | n/a |
| HTTP / TCP / SSL / domain checks | ✅ | ⚠️ | ✅ |
| JSON-body assertions | ✅ | ⚠️ | ⚠️ |
| Git audit trail of status | ✅ | ✅ | ❌ |
| Status page | ✅ | ✅ | ✅ |

⚠️ = partial / via plugins or workarounds. _Both Upptime and Uptime Kuma are
great projects — pick Pulse when you want serverless **and** multi-tenant RBAC._

## 🗺️ Roadmap

- [x] HTTP / TCP / SSL / domain checks
- [x] Keyword + JSON-body assertions
- [x] Multi-tenant groups + RBAC
- [x] Telegram / Email / Discord / Slack / webhook channels
- [x] Interactive setup wizard + demo seeder
- [ ] Maintenance windows (suppress alerts during planned work)
- [ ] Status-page subscriptions (email/RSS) for end users
- [ ] Per-incident public post-mortems
- [ ] Response-time SLO/percentile widgets
- [ ] More channels (Microsoft Teams, PagerDuty native, Opsgenie)
- [ ] Multi-region probes via matrix runners

Have an idea? [Open a feature request](.github/ISSUE_TEMPLATE/feature_request.yml).

## 🤝 Contributing

PRs and issues are very welcome! Start with **[CONTRIBUTING.md](CONTRIBUTING.md)**
and our [Code of Conduct](CODE_OF_CONDUCT.md). Good first steps: improve docs, add
a notification channel, or tackle a roadmap item.

```bash
npm install
npm run typecheck && npm test && npm run build   # what CI runs
```

## 📄 License

[MIT](LICENSE) © Pulse contributors. White-label it, ship it to clients, make it
yours.

<div align="center">

**If Pulse saves you a monitoring bill, give it a ⭐ — it helps a lot.**

</div>
