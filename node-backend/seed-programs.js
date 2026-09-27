/* mock program seeder: adds 1-7 random programs per sport.
   run once from node-backend/:  node seed-programs.js
   needs MONGODB_URI in .env (same one the server uses). */
require('dotenv').config();
const mongoose = require('mongoose');
const Sport = require('./models/Sport');
const Gym = require('./models/Gym');
const Program = require('./models/Program');

const isFitnessGym = g =>
  g.kind === 'gym' ||
  (g.kind !== 'venue' && /gold's gym|f45|cultfit|snap fitness|anytime fitness|crossfit|fitness first/i.test(g.name || ''));

const NAMES = {
  Athletics: ['Sprint Squad', 'Distance Runners Club', 'Morning Track Session', 'Throwers Lab', 'Jump Technique Camp', 'Evening Conditioning', 'Marathon Prep Group'],
  Badminton: ['Smash Academy', 'Shuttle Masters', 'Weekend Badminton Club', 'Footwork & Drills', 'Junior Badminton Batch', 'Doubles Strategy Night'],
  Basketball: ['Hoop Dreams Academy', 'Streetball Evenings', 'Junior Hoops', 'Shooting Clinic', 'Full Court League', 'Defense & Conditioning'],
  Boxing: ['Fight Club Basics', 'Sparring Sessions', 'Boxing Conditioning', 'Youth Boxing Batch', 'Advanced Ring Craft', 'Weekend Warriors Boxing'],
  Cricket: ['Pace Bowling Lab', 'Spin Clinic', 'Batting Masterclass', 'Wicketkeeping Camp', 'Junior Cricket Batch', 'T20 Skills Night', 'Fielding & Fitness'],
  Football: ['Strikers Academy', 'Midfield Maestro Camp', 'Goalkeeper Training', 'Futsal Nights', 'Junior Football Batch', 'Weekend League Prep'],
  Swimming: ['Learn to Swim', 'Stroke Correction', 'Aqua Fitness', 'Competitive Swim Squad', 'Kids Swim Batch', 'Open Water Prep'],
  'Table Tennis': ['Spin Masters', 'TT Beginners Batch', 'Advanced Rally Camp', 'Weekend TT League', 'Junior Paddlers'],
  Tennis: ['Serve & Volley Clinic', 'Tennis Beginners', 'Junior Tennis Squad', 'Doubles Camp', 'Evening Tennis Club', 'Cardio Tennis'],
  Volleyball: ['Spike Academy', 'Beach Volleyball Evenings', 'Junior Volleyball Batch', 'Serve & Receive Clinic', 'Volleyball League Nights'],
};
const COACHES = ['Arjun Reddy', 'Vikram Rao', 'Priya Sharma', 'Rahul Verma', 'Sneha Kulkarni', 'Aditya Nair', 'Kavya Menon', 'Ananya Iyer', 'Karthik Subramaniam', 'Divya Nair', 'Manoj Tiwari', 'Pooja Desai', 'Suresh Kumar', 'Imran Khan', 'Ritu Malhotra'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = [['06:00', '07:30'], ['07:00', '08:30'], ['17:00', '18:30'], ['18:00', '20:00'], ['19:00', '21:00']];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

(async () => {
  if (!process.env.MONGODB_URI) { console.error('MONGODB_URI missing in .env'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI);
  const sports = await Sport.find().lean();
  const gyms = await Gym.find().lean();
  const docs = [];
  for (const s of sports) {
    const sid = String(s._id);
    const venues = gyms.filter(g => {
      if (isFitnessGym(g)) return false;
      const gsid = g.sportId && g.sportId._id ? String(g.sportId._id) : String(g.sportId || '');
      return gsid === sid;
    });
    const pool = [...(NAMES[s.name] || ['Training Batch', 'Skills Camp', 'Weekend Club'])];
    const n = rnd(1, 7);
    for (let i = 0; i < n && pool.length; i++) {
      const name = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const v = venues.length ? pick(venues) : null;
      const [st, et] = pick(SLOTS);
      docs.push({
        sportId: s._id,
        name: s.name + ' ' + name,
        location: v ? [v.name, v.area].filter(Boolean).join(', ') : s.name + ' Center',
        gymId: v ? v._id : undefined,
        day: pick(DAYS),
        startTime: st,
        endTime: et,
        capacity: pick([15, 20, 25, 30, 40]),
        coach: pick(COACHES),
        priceInr: pick([1500, 2000, 2500, 3000, 3500, 4000, 5000]),
        pricePer: '/month',
        level: pick(LEVELS),
      });
    }
    console.log(s.name + ': +' + docs.filter(d => String(d.sportId) === sid).length);
  }
  await Program.insertMany(docs);
  console.log('inserted ' + docs.length + ' programs');
  await mongoose.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
