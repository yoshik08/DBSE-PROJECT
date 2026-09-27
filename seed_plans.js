/* Seed 20 subscription plans (2 per sport: monthly + quarterly) plus
 * 15 demo athletes, each with an active subscription, a paid invoice and a
 * successful payment so the merged billing table has data.
 * Run:  cd node-backend && MONGODB_URI='<your-uri>' node ../seed_plans.js
 * Safe to re-run: skips plans/users that already exist.
 */
const path = require('path');
const DRY = process.argv.includes('--dry-run');
const mongoose = DRY ? null : require(path.join(__dirname, 'node-backend', 'node_modules', 'mongoose'));

const PLANS = [
  ['Football', 2500, 6500], ['Cricket', 3000, 8000],
  ['Basketball', 2000, 5500], ['Tennis', 3500, 9500],
  ['Swimming', 4000, 11000], ['Athletics', 1800, 4800],
  ['Badminton', 2200, 6000], ['Volleyball', 1800, 4800],
  ['Table Tennis', 2000, 5500], ['Boxing', 2800, 7500],
];

const ATHLETES = [
  'Aarav Sharma', 'Vivaan Reddy', 'Arjun Mehta', 'Sai Charan', 'Rohan Gupta',
  'Ishaan Verma', 'Aditya Rao', 'Krishna Patel', 'Ananya Iyer', 'Diya Nair',
  'Kavya Singh', 'Meera Joshi', 'Rahul Desai', 'Nikhil Kumar', 'Sneha Kulkarni',
];

const METHODS = ['upi', 'card', 'netbanking'];
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const txnRef = () => 'pay_' + Math.random().toString(36).slice(2, 14).toUpperCase();

function buildPlans(existing) {
  const docs = [];
  for (const [sport, monthly, quarterly] of PLANS) {
    const m = { name: sport + ' Monthly', billingCycle: 'monthly', priceInr: monthly, description: sport + ' training, billed monthly.' };
    const q = { name: sport + ' Quarterly', billingCycle: 'quarterly', priceInr: quarterly, description: sport + ' training, billed quarterly. 2 weeks free.' };
    if (!existing.has(m.name)) docs.push(m);
    if (!existing.has(q.name)) docs.push(q);
  }
  return docs;
}

if (DRY) {
  const docs = buildPlans(new Set());
  console.log('would insert plans:', docs.length);
  console.log(docs.map(d => d.name + ' ₹' + d.priceInr).join('\n'));
  process.exit(0);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('set MONGODB_URI first'); process.exit(1); }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const existingPlans = await db.collection('plans').find({}).toArray();
  const planDocs = buildPlans(new Set(existingPlans.map(p => p.name)));
  if (planDocs.length) await db.collection('plans').insertMany(planDocs);
  console.log('plans inserted:', planDocs.length);

  const plans = await db.collection('plans').find({}).toArray();
  let usersMade = 0, subsMade = 0;
  for (let i = 0; i < ATHLETES.length; i++) {
    const name = ATHLETES[i];
    const email = name.toLowerCase().replace(/[^a-z]+/g, '.') + '@sportsphere.demo';
    let user = await db.collection('users').findOne({ email });
    if (!user) {
      const r = await db.collection('users').insertOne({
        fullName: name, email, passwordHash: 'OAUTH_ONLY',
        role: 'athlete', createdAt: new Date(),
      });
      user = { _id: r.insertedId, fullName: name, email };
      usersMade++;
    }
    const already = await db.collection('subscriptions').findOne({ userId: user._id, status: 'active' });
    if (already) continue;
    const plan = plans[(i * 7) % plans.length];
    const start = new Date(Date.now() - rnd(60) * 864e5);
    const sub = await db.collection('subscriptions').insertOne({
      userId: user._id, planId: plan._id, status: 'active',
      startDate: start, createdAt: start,
    });
    const inv = await db.collection('invoices').insertOne({
      subscriptionId: sub.insertedId, amountInr: plan.priceInr,
      status: 'paid', issuedAt: start,
    });
    await db.collection('payments').insertOne({
      invoiceId: inv.insertedId, amountInr: plan.priceInr,
      method: pick(METHODS), txnRef: txnRef(), status: 'success', paidAt: start,
    });
    subsMade++;
  }
  console.log('demo users created:', usersMade, '| subscriptions+invoices+payments:', subsMade);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
