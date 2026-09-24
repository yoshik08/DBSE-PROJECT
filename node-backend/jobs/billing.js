const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { emitToAdmins } = require('../realtime');

// runs every day at midnight:
//  1. subscriptions past endDate -> expired
//  2. invoices past dueDate and still pending -> overdue (dunning starts here)
//  3. active subscriptions ending within 3 days with no pending invoice
//     -> create the renewal invoice
function startBillingJobs() {
  cron.schedule('0 0 * * *', async () => {
    const now = new Date();
    console.log('[billing] running daily job', now.toISOString());

    const expired = await Subscription.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { status: 'expired' }
    );

    const overdue = await Invoice.find({ status: 'pending', dueDate: { $lt: now } });
    await Invoice.updateMany(
      { _id: { $in: overdue.map(i => i._id) } },
      { status: 'overdue' }
    );
    overdue.forEach(i => {
      i.status = 'overdue';
      emitToAdmins('invoice:updated', i); // live admin sync
    });

    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const renewals = await Subscription.find({
      status: 'active', endDate: { $lte: soon }
    }).populate('planId');

    let created = 0;
    for (const sub of renewals) {
      const pending = await Invoice.findOne({ subscriptionId: sub._id, status: 'pending' });
      if (pending) continue;
      const due = new Date(sub.endDate);
      const renewal = await Invoice.create({
        subscriptionId: sub._id,
        amountInr: sub.planId.priceInr,
        status: 'pending',
        dueDate: due
      });
      emitToAdmins('invoice:created', renewal); // live admin sync
      created++;
    }

    console.log(`[billing] expired=${expired.modifiedCount} overdue=${overdue.length} renewals=${created}`);
  });
}

module.exports = startBillingJobs;
