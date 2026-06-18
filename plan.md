Goal

Build a free monitoring platform for your own sites and clients with:

Multiple website/API monitoring
Public status pages
Private admin dashboard
Access control
Telegram notifications
Email notifications
GitHub Actions-based monitoring
No server costs
Cloudflare Pages hosting
Recommended Architecture
                    GitHub Actions
                  (every 5 minutes)
                           |
                           v
                 Monitor URLs/APIs
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
    Update Status                     Send Alerts
      History DB                    Telegram/Email
          |
          v
      Commit JSON
          |
          v
     Cloudflare Pages
          |
          v
   Admin Dashboard + Status Pages

Estimated cost:

GitHub          = Free
Cloudflare      = Free
Telegram Bot    = Free
Resend Email    = Free tier
Total           = $0
Why Not Use Vanilla Upptime?

Upptime is excellent but lacks:

Multi-user management
RBAC
Customer access
Site grouping
Tenant separation

For your needs, treat Upptime as the monitoring engine only.

Proposed Project
RBD Monitor

Components:

1. Monitoring Engine

GitHub Actions

Runs every 5 minutes.

Checks:

- https://example.com
- https://api.github.com
- https://client1.com
- https://client2.com

Outputs:

{
  "site":"acme-website",
  "status":"up",
  "responseTime":123,
  "checkedAt":"2026-06-18T00:00:00Z"
}

Stored in GitHub repo.

2. Status Data Store

Use GitHub itself.

Repository structure:

monitoring-repo

/history
  acme-website.json
  client1.json
  client2.json

/incidents
/config

No database needed.

3. Dashboard

Deploy on Cloudflare Pages.

Stack:

React
Vite
TypeScript
Tailwind
Shadcn

Reads monitoring data directly from GitHub Raw URLs.

Access Control
Authentication

Use:

Cloudflare Access

Free for small teams.

Supports:

Google Login
GitHub Login
Microsoft Login
Email OTP
Roles
SUPER_ADMIN
ADMIN
CLIENT
VIEWER

Example:

{
  "email":"client1@example.com",
  "role":"CLIENT",
  "sites":[
    "client1.com"
  ]
}

Store permissions in:

permissions.json

inside GitHub.

Dashboard Pages
Overview
Total Sites: 35

UP      34
DOWN     1

Availability
99.98%
Sites
Site Name
Current Status
Response Time
SSL Expiry
Uptime %
Site Detail
https://client1.com

Current Status
Response Time

24h graph
7d graph
30d graph

Incident history
Incidents
Site Down
Site Recovered
SSL Expiring
Notifications
Telegram

Create bot:

BotFather

GitHub Action:

curl \
  -X POST \
  https://api.telegram.org/botTOKEN/sendMessage \
  -d chat_id=CHATID \
  -d text="client1.com is DOWN"
Email

Use:

Resend

Free tier suitable for monitoring alerts.

Discord

Optional:

Discord Webhook

Very easy to integrate.

SSL Monitoring

GitHub Action checks:

openssl s_client

Alert if:

< 30 days remaining
Domain Expiry Monitoring

Use WHOIS APIs.

Alert:

30 days
15 days
7 days

before expiration.

API Monitoring

Example:

- name: API Health
  url: https://api.example.com/health
  expectedStatus: 200
Keyword Monitoring

Check:

"OK"
"Healthy"
"Connected"

inside response.

Cloudflare Pages Deployment

Repository:

monitor-dashboard

Connected to:

Cloudflare Pages

Auto deploy:

git push

→ dashboard updates.

GitHub Actions Schedule
schedule:
  - cron: "*/5 * * * *"

Every 5 minutes.

Multi-Tenant Structure
Company A
 ├── site1.com
 ├── site2.com

Company B
 ├── api.companyb.com
 ├── companyb.com

Permission mapping:

{
  "companyA": {
    "users": [
      "user1@email.com"
    ]
  }
}
Scaling Limits

GitHub Free generally supports this comfortably:

Sites	Interval
20	5 min
50	10 min
100	15 min

For your typical agency/client workload (20–50 endpoints), GitHub Actions remains practical.

Reference Build

This repo implements:

pulse-engine
    GitHub Actions

pulse-dashboard
    React + Vite

pulse-config
    Sites
    Clients
    Permissions

Cloudflare Pages
    Hosting

Cloudflare Access
    Authentication

Telegram
    Alerts

Resend
    Email

This gives you:

Always-free hosting
No servers to maintain
External monitoring
Client-facing dashboards
RBAC
Email/Telegram notifications
Easy white-labeling for clients

and aligns well with your existing Node.js/React/Kubernetes experience without introducing another VM to manage.