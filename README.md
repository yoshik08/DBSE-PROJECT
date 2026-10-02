# SportSphere

Sports subscription management — discover venues, book programs, manage memberships and billing in one place.

**Live site:** [sportsphere-app.vercel.app](https://sportsphere-app.vercel.app/) · **API:** [dbse-project.onrender.com](https://dbse-project.onrender.com)

## How it works

### For athletes
1. **Explore** — browse sports, drill into venues and gyms, preview each place on the map.
2. **Book** — pick a program at any venue and check out. Razorpay in test mode, with a mock checkout fallback.
3. **Subscribe** — grab an All-Access plan that works across every venue and program.
4. **Track** — the member portal shows subscriptions, class schedule, invoices and profile.

### For gym owners
Gym accounts get their own portal: member roster, program management and billing.

### For admins
The admin portal is MFA-protected (authenticator app) and gives a live dashboard: revenue, transactions, users, venues and programs. Invoices sync to admins in real time over websockets, transactions export to CSV, and venues or gyms can be added or removed directly — synced straight to the database.

## Stack

- **Frontend** — single-file apps (`frontend/index.html` for members, `frontend/admin/index.html` for admins), Leaflet maps
- **Backend** — Node.js + Express, MongoDB Atlas
- **Auth** — Google OAuth → JWT for members, TOTP authenticator MFA for admins
- **Payments** — Razorpay (test mode)
- **Realtime** — Socket.IO invoice sync · **Billing** — daily cron · **Export** — CSV

## Repo layout

```
frontend/
  index.html        # member site (deploys to Vercel)
  admin/index.html  # admin portal
node-backend/
  server.js         # express entry point
  routes/           # auth, programs, bookings, subscriptions, payments, invoices, admin...
  models/           # mongoose schemas
  jobs/             # daily billing cron
```

## Run it locally

```bash
cd node-backend
npm install
cp .env.example .env   # fill in Mongo URI, Google client ID, Razorpay keys
npm start
```

Then open `frontend/index.html` in a browser (or serve it with any static server).

## Test payments

Razorpay runs in test mode — no real money moves. If the keys are missing, checkout falls back to a mock popup so the full booking flow still works end to end.
