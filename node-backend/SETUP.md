# SportSphere backend — setup (node.js + express + mongodb)

everything here is free: node, atlas M0, razorpay test mode, google oauth.

## 1. install node 20 LTS
nodejs.org → download LTS → install. check with `node -v`.

## 2. install packages
```bash
cd node-backend
npm install
```

## 3. mongodb atlas (free)
1. cloud.mongodb.com → sign up → create free M0 cluster
2. database access → add user (username + password)
3. network access → allow 0.0.0.0/0 (fine for demo)
4. connect → drivers → copy connection string

## 4. seed the database
```bash
mongosh "<your-atlas-connection-string>" --file ../mongo_seed.js
```
10 sports, 20 programs (real Hyderabad venues), 3 plans, 2 demo users, plus demo subscriptions/invoices/payments.

## 5. configure
```bash
cp .env.example .env
```
fill in: MONGODB_URI, GOOGLE_CLIENT_ID (console.cloud.google.com →
credentials → oauth client id, redirect uri not needed for this flow),
JWT_SECRET (any long random string), RAZORPAY_KEY_ID + SECRET
(razorpay dashboard → test mode → api keys).

## 6. run
```bash
npm run dev
```
api on http://localhost:5000. check /api/health.

## 7. google login on the frontend
use google identity services on the site: the "login with google" button
returns an `idToken`, POST it to `/api/auth/google`, store the returned
jwt, send it as `Authorization: Bearer <jwt>` on every api call.

## api map
- POST /api/auth/google { idToken } → { token, user }
- GET  /api/auth/me (auth)
- GET  /api/sports, /api/programs?sportId=, /api/plans
- POST /api/subscriptions { planId, programId? } (auth) → { subscription, invoice }
- GET  /api/subscriptions/mine (auth)
- GET  /api/invoices/mine (auth)
- POST /api/payments/order { invoiceId } (auth) → razorpay order
- POST /api/payments/verify { invoiceId, orderId, paymentId, signature } (auth)
- GET  /api/admin/stats, /users, /subscriptions, /invoices (admin)
- GET  /api/admin/export/transactions?token=<jwt> (admin) -> downloads transactions csv
- POST/PUT/DELETE /api/admin/programs (admin)
- GET  /api/gyms (public venue directory with program counts)
- GET  /api/gyms/:id (public venue detail with its programs)
- GET  /api/gym/dashboard (gym owner) -> venues, programs, members, invoices, stats
- POST/PUT/DELETE /api/gym/programs (gym owner, own venues only)
- POST /api/gym/venues (gym owner) -> add your own venue
- POST /api/ai/chat { message } (public) -> gemini answer grounded in the live catalog

## realtime admin sync (socket.io)
the backend pushes invoice events to connected admins instantly:
- `invoice:created` — new subscription invoice or cron renewal invoice
- `invoice:updated` — invoice paid or marked overdue by the cron

admin frontend: connect socket.io-client with `{ auth: { token: jwt } }`,
listen for those events and patch the invoice table live. no refresh.

## billing cron
runs daily at midnight automatically: expires old subscriptions,
marks overdue invoices, creates renewal invoices for subs ending
within 3 days.
