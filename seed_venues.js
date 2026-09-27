/* Seed 25 venues per sport (10 sports = 250 venues) + tag existing gyms with sportId.
 * Run:  cd node-backend && MONGODB_URI='<your-uri>' node ../seed_venues.js
 * Safe to re-run: skips venue names that already exist.
 */
const DRY = process.argv.includes('--dry-run');
const path = require('path');
const mongoose = DRY ? null : require(path.join(__dirname, 'node-backend', 'node_modules', 'mongoose'));

const uri = DRY ? null : process.env.MONGODB_URI;
if (!uri && !DRY) { console.error('set MONGODB_URI first'); process.exit(1); }

// 25 Hyderabad areas with approximate centres
const AREAS = [
  ['Madhapur', 17.4483, 78.3915], ['Jubilee Hills', 17.4325, 78.407],
  ['Kondapur', 17.465, 78.36], ['Gachibowli', 17.4419, 78.3456],
  ['Kukatpally', 17.4848, 78.4138], ['Dilsukhnagar', 17.3685, 78.5247],
  ['Secunderabad', 17.4399, 78.4983], ['Begumpet', 17.4448, 78.4687],
  ['Ameerpet', 17.4375, 78.4484], ['Banjara Hills', 17.4156, 78.4347],
  ['Himayat Nagar', 17.3953, 78.4867], ['Basheer Bagh', 17.393, 78.476],
  ['Saroornagar', 17.36, 78.53], ['LB Nagar', 17.3457, 78.5522],
  ['Uppal', 17.4062, 78.5507], ['Kapra', 17.49, 78.57],
  ['Yapral', 17.48, 78.49], ['Bowenpally', 17.4639, 78.4678],
  ['Falaknuma', 17.33, 78.47], ['Somajiguda', 17.43, 78.45],
  ['Film Nagar', 17.42, 78.38], ['Masab Tank', 17.4126, 78.4482],
  ['Yousufguda', 17.428, 78.44], ['Fateh Maidan', 17.4, 78.474],
  ['Bagh Lingampally', 17.41, 78.492],
];

// name templates per sport, cycled across areas
const TEMPLATES = {
  'Football': ['{A} Football Academy', '{A} Soccer Club', 'FC {A}'],
  'Cricket': ['{A} Cricket Academy', '{A} Cricket Club', '{A} Cricket Oval'],
  'Basketball': ['{A} Basketball Academy', '{A} Hoops Academy', '{A} Basketball Courts'],
  'Tennis': ['{A} Tennis Academy', '{A} Tennis Club', '{A} Tennis Centre'],
  'Swimming': ['{A} Aquatics Centre', '{A} Swimming Academy', '{A} Swim Club'],
  'Athletics': ['{A} Athletics Club', '{A} Running Track', '{A} Sports Complex'],
  'Badminton': ['{A} Badminton Academy', '{A} Shuttle Academy', '{A} Badminton Courts'],
  'Volleyball': ['{A} Volleyball Academy', '{A} Volleyball Club', '{A} Volleyball Courts'],
  'Table Tennis': ['{A} Table Tennis Academy', 'TT Academy {A}', '{A} Paddle Club'],
  'Boxing': ['{A} Boxing Academy', '{A} Fight Club', '{A} Boxing Gym'],
};

// keyword -> sport for tagging existing gyms
const KEYWORDS = [
  [/football|soccer/i, 'Football'], [/cricket/i, 'Cricket'],
  [/basketball|hoops|indoor/i, 'Basketball'], [/tennis/i, 'Tennis'],
  [/swim|aquatic/i, 'Swimming'], [/athletic/i, 'Athletics'],
  [/stadium/i, 'Athletics'], [/badminton|battledore|shuttle/i, 'Badminton'],
  [/volley/i, 'Volleyball'], [/table tennis/i, 'Table Tennis'],
  [/box/i, 'Boxing'],
];

const jitter = () => (Math.random() - 0.5) * 0.006;

function buildDocs(sports, existingNames) {
  const sid = n => { const s = sports.find(x => x.name === n); return s ? s._id : null; };
  const names = new Set(existingNames);
  const docs = [];
  for (const [sport, templates] of Object.entries(TEMPLATES)) {
    const sportId = sid(sport);
    if (!sportId) continue;
    AREAS.forEach(([area, lat, lng], i) => {
      const name = templates[i % templates.length].replace('{A}', area);
      if (names.has(name)) return;
      names.add(name);
      docs.push({
        name, area,
        address: name + ', ' + area + ', Hyderabad',
        lat: +(lat + jitter()).toFixed(4),
        lng: +(lng + jitter()).toFixed(4),
        phone: '', email: '', sportId,
        createdAt: new Date(),
      });
    });
  }
  return docs;
}

if (DRY) {
  const fakeSports = Object.keys(TEMPLATES).map(n => ({ name: n, _id: n }));
  const docs = buildDocs(fakeSports, []);
  const per = {};
  docs.forEach(d => { const s = fakeSports.find(x => String(x._id) === String(d.sportId)).name; per[s] = (per[s] || 0) + 1; });
  console.log('would insert:', docs.length);
  console.log(per);
  console.log('sample:', docs[0], docs[docs.length - 1]);
  process.exit(0);
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const sports = await db.collection('sports').find({}).toArray();
  const sid = n => { const s = sports.find(x => x.name === n); return s ? s._id : null; };

  // 1. tag existing gyms
  let tagged = 0;
  const existing = await db.collection('gyms').find({}).toArray();
  for (const g of existing) {
    const hit = KEYWORDS.find(([re]) => re.test(g.name || ''));
    if (hit && !g.sportId) {
      await db.collection('gyms').updateOne({ _id: g._id }, { $set: { sportId: sid(hit[1]) } });
      tagged++;
    }
  }
  console.log('tagged existing gyms:', tagged);

  // 2. insert 25 new venues per sport
  const names = new Set(existing.map(g => g.name));
  const docs = buildDocs(sports, [...names]);
  let inserted = 0;
  const perSport = {};
  if (docs.length) {
    await db.collection('gyms').insertMany(docs);
    inserted = docs.length;
    const id2name = {};
    sports.forEach(s => { id2name[String(s._id)] = s.name; });
    docs.forEach(d => { const n = id2name[String(d.sportId)]; perSport[n] = (perSport[n] || 0) + 1; });
  }
  console.log('inserted new venues:', inserted);
  console.log(perSport);

  const totals = await db.collection('gyms').aggregate([
    { $group: { _id: '$sportId', n: { $sum: 1 } } },
  ]).toArray();
  for (const t of totals) {
    const s = sports.find(x => String(x._id) === String(t._id));
    console.log((s ? s.name : 'no-sport') + ': ' + t.n);
  }
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
