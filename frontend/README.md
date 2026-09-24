# SportSphere frontend

Single-file site wired to the Node/Express API. Open `index.html` in a browser
(or serve it) while the backend runs.

## before first run, change 2 values at the top of the `<script>` block

1. `API` — backend base url. default `http://localhost:5000`, change it when
   the backend is deployed somewhere else.
2. `GOOGLE_CLIENT_ID` — replace `CHANGE_ME` with the same client id used in
   the backend `.env`. login will not work until this is set.

## what is wired

- sports / programs / plans load from the api, filter works on live data
- login is google only -> backend verifies the token -> jwt stored in localStorage
- choose plan -> creates subscription + invoice -> razorpay checkout (test mode)
  -> verify -> plan activates
- user portal: subscriptions, schedule, invoices all from the api
- admin portal: stats, users, subscriptions, invoices from the api
- admin invoices update live over socket.io, no refresh
- export csv button downloads the transactions file
- ai widget answers from the live program/plan catalog
