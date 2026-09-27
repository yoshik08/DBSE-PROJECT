// reseed-real-venues.js
// Replaces the 250 generated sports venues (seeded 2026-09-27 ~10:51 UTC) with
// researched real Hyderabad venues. Safe by construction:
//   - deletes ONLY gyms created inside the seed-batch minute that have a sportId
//   - keeps your fitness gyms (no sportId) and every venue you added manually
//   - never inserts a (name, sport) pair that already exists -> idempotent
//   - rewires programs off deleted venues onto real venues of the same sport
//     (round-robin; programs stay mock, places become real)
//   - second run exits immediately with "already done"
//
// usage (PowerShell, inside node-backend):
//   $env:MONGODB_URI="<copy it from your Render dashboard > Environment>"
//   node reseed-real-venues.js

require('dotenv').config(); // reads MONGODB_URI from the local .env, so just run: node reseed-real-venues.js
const mongoose = require('mongoose');
const Gym = require('./models/Gym');
const Program = require('./models/Program');
const Sport = require('./models/Sport');
const REAL_VENUES = require('./real-venues-data');

const SEED_FROM = new Date('2026-09-27T10:50:00Z');
const SEED_TO = new Date('2026-09-27T10:53:00Z');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. In PowerShell:\n  $env:MONGODB_URI="<paste from Render dashboard>"; node reseed-real-venues.js');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('connected.');

  const sports = await Sport.find().lean();
  const sportIdByName = Object.fromEntries(sports.map(s => [s.name, s._id]));
  const sportNameById = Object.fromEntries(sports.map(s => [String(s._id), s.name]));

  const gyms = await Gym.find().lean();
  const seedBatch = gyms.filter(g =>
    g.sportId && g.createdAt && g.createdAt >= SEED_FROM && g.createdAt < SEED_TO);
  const seedIds = new Set(seedBatch.map(g => String(g._id)));

  // ---- idempotency: already reseeded? ----
  if (seedBatch.length === 0) {
    const marker = await Gym.findOne({ name: 'Rajiv Gandhi International Cricket Stadium', kind: 'venue' }).lean();
    if (marker) {
      console.log('already reseeded: seed batch is gone and real venues are present. nothing to do.');
      await mongoose.disconnect();
      return;
    }
    console.error('no seed batch found and no real venues present. aborting to be safe.');
    process.exit(1);
  }

  const kept = gyms.filter(g => !seedIds.has(String(g._id)));
  const keptNoSport = kept.filter(g => !g.sportId);
  console.log(`preflight: will DELETE ${seedBatch.length} generated venues, KEEP ${kept.length} records (${keptNoSport.length} fitness gyms, ${kept.length - keptNoSport.length} manual venue adds).`);

  // pairs that already exist anywhere in the db -> never duplicate
  const existingPairs = new Set(
    gyms.filter(g => g.sportId).map(g => `${g.name}||${sportNameById[String(g.sportId)]}`)
  );

  // ---- build insert docs: one record per sport link ----
  const docs = [];
  let skipped = 0;
  for (const v of REAL_VENUES) {
    for (const sport of v.sports) {
      if (!sportIdByName[sport]) { console.error(`unknown sport in data: ${sport}`); process.exit(1); }
      if (existingPairs.has(`${v.name}||${sport}`)) { skipped++; continue; }
      docs.push({
        name: v.name, area: v.area, address: v.address,
        lat: v.lat, lng: v.lng,
        sportId: sportIdByName[sport], kind: 'venue',
      });
      existingPairs.add(`${v.name}||${sport}`);
    }
  }
  console.log(`inserting ${docs.length} real venue records (skipped ${skipped} you already have).`);
  const inserted = docs.length ? await Gym.insertMany(docs, { ordered: true }) : [];

  // ---- venue pool per sport (new + your manual adds) for program rewiring ----
  const pool = {}; // sportName -> [gym docs]
  const allVenues = [...kept.filter(g => g.sportId), ...inserted];
  for (const g of allVenues) {
    const sn = sportNameById[String(g.sportId)];
    if (!sn) continue;
    (pool[sn] = pool[sn] || []).push(g);
  }

  // ---- rewire programs off deleted venues ----
  const programs = await Program.find().lean();
  const rr = {}; // round-robin cursor per sport
  let rewired = 0, untouched = 0;
  const bulk = [];
  for (const p of programs) {
    if (!p.gymId || !seedIds.has(String(p.gymId))) { untouched++; continue; }
    const sn = p.sportId ? sportNameById[String(p.sportId._id || p.sportId)] : null;
    const venues = sn && pool[sn];
    if (!venues || !venues.length) { console.error(`no venue pool for program sport: ${sn}`); process.exit(1); }
    const v = venues[(rr[sn] = (rr[sn] || 0) + 1) % venues.length];
    bulk.push({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { gymId: v._id, location: `${v.name}, ${v.area || ''}`.trim() } },
      },
    });
    rewired++;
  }
  if (bulk.length) await Program.bulkWrite(bulk);
  console.log(`programs: rewired ${rewired} onto real venues, left ${untouched} untouched.`);

  // ---- delete the generated batch ----
  await Gym.deleteMany({ _id: { $in: seedBatch.map(g => g._id) } });
  console.log(`deleted ${seedBatch.length} generated venues.`);

  // ---- normalize kinds ----
  const r1 = await Gym.updateMany({ sportId: { $exists: false }, kind: { $ne: 'gym' } }, { $set: { kind: 'gym' } });
  const r2 = await Gym.updateMany({ sportId: { $exists: true }, kind: { $ne: 'venue' } }, { $set: { kind: 'venue' } });
  console.log(`kinds normalized: ${r1.modifiedCount} fitness gyms, ${r2.modifiedCount} venues.`);

  // ---- verify ----
  const finalGyms = await Gym.find().lean();
  const gymIds = new Set(finalGyms.map(g => String(g._id)));
  const dangling = await Program.countDocuments({ gymId: { $ne: null, $nin: [...gymIds].map(id => new mongoose.Types.ObjectId(id)) } });
  const perSport = {};
  for (const g of finalGyms) {
    if (!g.sportId) continue;
    const sn = sportNameById[String(g.sportId)] || '?';
    perSport[sn] = (perSport[sn] || 0) + 1;
  }
  console.log('---- done ----');
  console.log(`total gyms/venues: ${finalGyms.length} (fitness: ${finalGyms.filter(g => !g.sportId).length})`);
  console.log('venues per sport:', JSON.stringify(perSport));
  console.log(`programs with dangling gymId: ${dangling}`);
  if (dangling !== 0) { console.error('VERIFICATION FAILED: dangling programs remain.'); process.exit(1); }
  console.log('verification passed.');

  await mongoose.disconnect();
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
