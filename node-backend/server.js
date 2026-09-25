require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const { initRealtime } = require('./realtime');
const startBillingJobs = require('./jobs/billing');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/sports', require('./routes/sports'));
app.use('/api/programs', require('./routes/programs'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/gyms', require('./routes/gyms'));
app.use('/api/gym', require('./routes/gym'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/bookings', require('./routes/bookings'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// GET /api/stats -> public homepage metrics, live atlas counts
app.get('/api/stats', async (req, res) => {
  try {
    const User = require('./models/User');
    const Sport = require('./models/Sport');
    const Program = require('./models/Program');
    const Subscription = require('./models/Subscription');
    const [athletes, sports, programs, activeSubscriptions] = await Promise.all([
      User.countDocuments({ role: 'athlete' }),
      Sport.countDocuments(),
      Program.countDocuments(),
      Subscription.countDocuments({ status: 'active' })
    ]);
    res.json({ athletes, sports, programs, activeSubscriptions });
  } catch (e) { res.status(500).json({ error: 'stats failed' }); }
});

// a bad request must never crash the process (express 4 does not catch async throws)
process.on('unhandledRejection', (err) => console.error('unhandled rejection:', err && err.message));
app.use((err, req, res, next) => {
  console.error('api error:', err.message);
  const status = err.name === 'ValidationError' || err.code === 11000 ? 400 : (err.status || 500);
  res.status(status).json({ error: err.message || 'server error' });
});

const server = http.createServer(app);
initRealtime(server); // socket.io for live admin updates

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  startBillingJobs(); // daily billing cron
  server.listen(PORT, () => console.log('api running on port ' + PORT));
});
