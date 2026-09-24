// SportSphere seed for MongoDB Atlas
// run: mongosh "<your-atlas-connection-string>" --file mongo_seed.js
// safe to re-run: drops the collections first (demo reset)

db = db.getSiblingDB("sportsphere");

["users","sports","gyms","programs","plans","subscriptions","invoices","payments"]
  .forEach(c => db[c].drop());

db.sports.insertMany([
  {name:"Football",icon:"⚽"},{name:"Cricket",icon:"🏏"},
  {name:"Basketball",icon:"🏀"},{name:"Tennis",icon:"🎾"},
  {name:"Swimming",icon:"🏊"},{name:"Athletics",icon:"🏃"},
  {name:"Badminton",icon:"🏸"},{name:"Volleyball",icon:"🏐"},
  {name:"Table Tennis",icon:"🏓"},{name:"Boxing",icon:"🥊"}
]);
const sid = n => db.sports.findOne({name:n})._id;

// 16 real Hyderabad venues (lat/lng drive the maps embed)
db.gyms.insertMany([
  {name:"Skykings Football Academy",area:"Bowenpally",address:"186/A, HP Petrol Pump, Plassy Lines, Bowenpally, Hyderabad 500011",lat:17.4639,lng:78.4678,phone:"+91 9704299881",email:""},
  {name:"GMC Balayogi Athletic Stadium",area:"Gachibowli",address:"Gachibowli, Hyderabad",lat:17.4419,lng:78.3456,phone:"",email:""},
  {name:"Arshad Ayub Cricket Academy",area:"Masab Tank",address:"Raj Janakiprasad Road, Potti Sriramulu Nagar, Masab Tank, Hyderabad 500028",lat:17.4126,lng:78.4482,phone:"+91 9440011743",email:"arshad@arshadayubcricketacademy.com"},
  {name:"Sarojini Cricket & Fitness Academy",area:"Bagh Lingampally",address:"Street No 1, Bagh Lingampally, Hyderabad",lat:17.41,lng:78.492,phone:"",email:""},
  {name:"GMC Balayogi Indoor Stadium",area:"Gachibowli",address:"Gachibowli, Hyderabad",lat:17.4425,lng:78.346,phone:"",email:""},
  {name:"Kotla Vijay Bhaskar Reddy Indoor Stadium",area:"Yousufguda",address:"Yousufguda, Hyderabad",lat:17.428,lng:78.44,phone:"",email:""},
  {name:"Sania Mirza Tennis Academy",area:"Film Nagar",address:"61A, Rd Number 9, Film Nagar, Hyderabad 500033",lat:17.42,lng:78.38,phone:"+91 9966964371",email:"tournamentssmta@gmail.com"},
  {name:"SAAP Tennis Complex",area:"Fateh Maidan",address:"Fateh Maidan, Hyderabad",lat:17.4,lng:78.474,phone:"",email:""},
  {name:"Gachibowli Aquatics Complex",area:"Gachibowli",address:"Gachibowli, Hyderabad",lat:17.44,lng:78.35,phone:"",email:""},
  {name:"Pioneer Swimming Academy",area:"Yapral",address:"Near Rajha Convention, Yapral, Secunderabad",lat:17.48,lng:78.49,phone:"+91 9963192193",email:""},
  {name:"LB Stadium",area:"Fateh Maidan",address:"Fateh Maidan, Hyderabad",lat:17.398,lng:78.476,phone:"",email:""},
  {name:"RG Battledore Badminton Academy",area:"Kondapur",address:"Rajarajeshwari Colony, Kondapur, Hyderabad",lat:17.465,lng:78.36,phone:"",email:""},
  {name:"Saroornagar Indoor Arena",area:"Saroornagar",address:"Saroornagar, Hyderabad",lat:17.36,lng:78.53,phone:"",email:""},
  {name:"Inspire Table Tennis Academy",area:"Kapra",address:"Plot No. 87, Ashok Manipuri, Kapra, Hyderabad 500062",lat:17.49,lng:78.57,phone:"+91 9000111594",email:""},
  {name:"Habeeb Mustafa Boxing Academy",area:"Falaknuma",address:"18-4-42/6, RBR Complex, Shamsheer Gunj, Engine Bowli, Aliabad, Hyderabad 500053",lat:17.33,lng:78.47,phone:"+91 9652924694",email:""},
  {name:"Iskimos Kick Boxing Academy",area:"Somajiguda",address:"6-3-550, LB Bhavan, Somajiguda, Hyderabad 500082",lat:17.43,lng:78.45,phone:"+91 9885346824",email:"info@iskimos.com"},
  {name:"Gold's Gym Banjara Hills",area:"Banjara Hills",address:"Plot No. 8-2-701/12, Road No. 12, Banjara Hills, Hyderabad 500034",lat:17.4156,lng:78.4347,phone:"040-23377999",email:"banjarahills.hyd@goldsgym.in"},
  {name:"Gold's Gym Himayat Nagar",area:"Himayat Nagar",address:"3-6-289, 3rd Floor, Hyderguda Main Road, Himayathnagar, Hyderabad 500029",lat:17.3953,lng:78.4867,phone:"9000026767",email:"himayatnagar.hyderabad@goldsgym.in"},
  {name:"F45 Training Basheer Bagh",area:"Basheer Bagh",address:"1st Floor, Skyline & Sterling Residency, Shaheed Yar Jung Rd, Basheer Bagh, Hyderabad 500029",lat:17.393,lng:78.476,phone:"+91 9052924545",email:""},
  {name:"F45 Training Madhapur",area:"Madhapur",address:"2nd Floor, Xenospace Building, Opp. Karachi Bakery, Madhapur, Hyderabad 500081",lat:17.4483,lng:78.3915,phone:"+91 9160540545",email:""},
  {name:"Snap Fitness Madhapur",area:"Madhapur",address:"Sun Towers, 3rd Floor, Plot No. 22, HUDA Techno Enclave, Madhapur, Hyderabad 500081",lat:17.446,lng:78.394,phone:"040-64648833",email:""},
  {name:"Anytime Fitness Jubilee Hills",area:"Jubilee Hills",address:"Plot No. 71, Road No. 1 & 9, Jubilee Hills, Hyderabad 500033",lat:17.4325,lng:78.407,phone:"040-40207365",email:""}
]);
const gid = n => db.gyms.findOne({name:n})._id;

// [sport, program, gym, location, day, start, end, capacity, coach, level]
const progRows = [
  ["Football","Football Training","Skykings Football Academy","Skykings Football Academy, Bowenpally","Monday","18:00","20:00",30,"Arjun Reddy","intermediate",2500],
  ["Football","Football Fitness","GMC Balayogi Athletic Stadium","GMC Balayogi Athletic Stadium, Gachibowli","Wednesday","06:00","07:30",25,"Arjun Reddy","beginner",2500],
  ["Cricket","Cricket Academy","Arshad Ayub Cricket Academy","Arshad Ayub Cricket Academy, Masab Tank","Tuesday","17:00","19:30",40,"Vikram Rao","advanced",2500],
  ["Cricket","Cricket Fitness","Sarojini Cricket & Fitness Academy","Sarojini Cricket & Fitness Academy, Bagh Lingampally","Thursday","06:00","07:30",30,"Vikram Rao","beginner",2500],
  ["Basketball","Basketball Training","GMC Balayogi Indoor Stadium","GMC Balayogi Indoor Stadium, Gachibowli","Monday","17:00","19:00",25,"Sameer Khan","intermediate",1800],
  ["Basketball","Basketball Fitness","Kotla Vijay Bhaskar Reddy Indoor Stadium","Kotla Vijay Bhaskar Reddy Indoor Stadium, Yousufguda","Friday","06:00","07:30",25,"Sameer Khan","beginner",1800],
  ["Tennis","Tennis Academy","Sania Mirza Tennis Academy","Sania Mirza Tennis Academy, Film Nagar","Saturday","07:00","09:00",20,"Ananya Iyer","advanced",3000],
  ["Tennis","Tennis Fitness","SAAP Tennis Complex","SAAP Tennis Complex, Fateh Maidan","Wednesday","06:00","07:30",20,"Ananya Iyer","beginner",3000],
  ["Swimming","Swimming Training","Gachibowli Aquatics Complex","Gachibowli Aquatics Complex","Tuesday","06:30","08:00",20,"Rohan Mehta","intermediate",4000],
  ["Swimming","Swimming Fitness","Pioneer Swimming Academy","Pioneer Swimming Academy, Yapral","Saturday","07:00","08:30",20,"Rohan Mehta","beginner",4000],
  ["Athletics","Athletics Training","GMC Balayogi Athletic Stadium","GMC Balayogi Athletic Stadium, Gachibowli","Monday","06:00","08:00",30,"Kavya Nair","advanced",2000],
  ["Athletics","Athletics Fitness","LB Stadium","LB Stadium, Fateh Maidan","Friday","06:30","08:00",25,"Kavya Nair","beginner",2000],
  ["Badminton","Badminton Academy","RG Battledore Badminton Academy","RG Battledore Badminton Academy, Kondapur","Wednesday","18:00","20:00",20,"Aditya Rao","intermediate",2500],
  ["Badminton","Badminton Fitness","Saroornagar Indoor Arena","Saroornagar Indoor Arena","Saturday","16:00","17:30",20,"Aditya Rao","beginner",2500],
  ["Volleyball","Volleyball Training","Kotla Vijay Bhaskar Reddy Indoor Stadium","Kotla Vijay Bhaskar Reddy Indoor Stadium, Yousufguda","Thursday","18:00","20:00",30,"Sneha Kulkarni","intermediate",2500],
  ["Volleyball","Volleyball Fitness","GMC Balayogi Indoor Stadium","GMC Balayogi Indoor Stadium, Gachibowli","Saturday","08:00","09:30",25,"Sneha Kulkarni","beginner",2500],
  ["Table Tennis","Table Tennis Academy","Inspire Table Tennis Academy","Inspire Table Tennis Academy, Kapra","Tuesday","18:00","20:00",20,"Nikhil Verma","advanced",2000],
  ["Table Tennis","Table Tennis Fitness","Saroornagar Indoor Arena","Saroornagar Indoor Arena","Friday","18:00","19:30",20,"Nikhil Verma","beginner",2000],
  ["Boxing","Boxing Academy","Habeeb Mustafa Boxing Academy","Habeeb Mustafa Boxing Academy, Falaknuma","Wednesday","18:00","20:00",20,"Imran Sheikh","intermediate",2500],
  ["Boxing","Boxing Fitness","Iskimos Kick Boxing Academy","Iskimos Kick Boxing Academy, Somajiguda","Sunday","08:00","09:30",25,"Imran Sheikh","beginner",2500]
];
const gymProgRows = [
  [null,"Annual Membership","Gold's Gym Banjara Hills","Gold's Gym, Banjara Hills","Monday","05:00","23:00",500,"","beginner",30450,"/year"],
  [null,"Annual Membership","Gold's Gym Himayat Nagar","Gold's Gym, Himayat Nagar","Monday","05:00","23:00",500,"","beginner",26775,"/year"],
  [null,"Functional Training","F45 Training Basheer Bagh","F45 Training, Basheer Bagh","Monday","06:00","21:00",27,"","intermediate",6999,"/month"],
  [null,"Functional Training","F45 Training Madhapur","F45 Training, Madhapur","Monday","06:00","21:00",27,"","intermediate",6174,"/month"],
  [null,"Gym Membership","Snap Fitness Madhapur","Snap Fitness, Madhapur","Monday","05:00","23:00",300,"","beginner",4000,"/month"],
  [null,"Gym Membership","Anytime Fitness Jubilee Hills","Anytime Fitness, Jubilee Hills","Monday","00:00","23:59",300,"","beginner",8000,"/month"]
];
db.programs.insertMany(progRows.concat(gymProgRows).map(r => ({
  sportId: r[0] ? sid(r[0]) : null, name: r[1], gymId: gid(r[2]), location: r[3], priceInr: r[10], pricePer: "/month",
  day: r[4], startTime: r[5], endTime: r[6], capacity: r[7], coach: r[8], level: r[9]
})));

db.plans.insertMany([
  {name:"All-Access",billingCycle:"monthly",priceInr:20000,description:"Every sport, every arena, every program. One membership for the whole city."}
]);

// demo logins via google oauth
// passwordHash "OAUTH_ONLY" = no password login, google only
const gymOwnerId = db.users.insertOne(
  {fullName:"demo gym owner",email:"gym@sportsphere.com",passwordHash:"OAUTH_ONLY",phone:"+91 91234 56789",role:"gym",googleSub:null,createdAt:new Date()}
).insertedId;
db.users.insertMany([
  {fullName:"admin",email:"admin@sportsphere.com",passwordHash:"OAUTH_ONLY",phone:null,role:"admin",googleSub:null,createdAt:new Date()},
  {fullName:"demo athlete",email:"athlete@example.com",passwordHash:"OAUTH_ONLY",phone:"+91 98765 43210",role:"athlete",googleSub:null,createdAt:new Date()}
]);
// demo owner runs two venues
db.gyms.updateMany(
  {name:{$in:["Skykings Football Academy","Inspire Table Tennis Academy"]}},
  {$set:{ownerId:gymOwnerId}}
);

// demo transactions so every screen has live data on first login
const athlete = db.users.findOne({email:"athlete@example.com"})._id;
const allAccess = db.plans.findOne({name:"All-Access"})._id;
const footballProg = db.programs.findOne({name:"Football Training"})._id;
const badmintonProg = db.programs.findOne({name:"Badminton Academy"})._id;
const now = new Date();
const sub1 = db.subscriptions.insertOne({
  userId: athlete, planId: allAccess, programId: footballProg,
  status: "active", startDate: new Date(now - 5*864e5), endDate: new Date(now + 25*864e5)
}).insertedId;
const sub2 = db.subscriptions.insertOne({
  userId: athlete, planId: allAccess, programId: badmintonProg,
  status: "active", startDate: new Date(now - 2*864e5), endDate: new Date(now + 28*864e5)
}).insertedId;
const inv1 = db.invoices.insertOne({
  subscriptionId: sub1, amountInr: 20000, status: "paid",
  issuedAt: new Date(now - 5*864e5), dueDate: new Date(now + 2*864e5)
}).insertedId;
db.invoices.insertOne({
  subscriptionId: sub2, amountInr: 20000, status: "pending",
  issuedAt: new Date(now - 2*864e5), dueDate: new Date(now + 5*864e5)
});
db.payments.insertOne({
  invoiceId: inv1, amountInr: 20000, method: "upi",
  txnRef: "pay_TestDemo001", status: "success", paidAt: new Date(now - 5*864e5)
});

print("seeded: " + db.sports.countDocuments() + " sports, "
  + db.gyms.countDocuments() + " gyms, "
  + db.programs.countDocuments() + " programs, "
  + db.plans.countDocuments() + " plans, "
  + db.users.countDocuments() + " users, "
  + db.subscriptions.countDocuments() + " subscriptions, "
  + db.invoices.countDocuments() + " invoices, "
  + db.payments.countDocuments() + " payments");
