-- SportSphere : schema v1 (PostgreSQL / Supabase)
-- modules: user mgmt, sports, programs, plans, subscriptions, billing, admin
-- run this in the Supabase SQL editor

CREATE TABLE users (
  user_id       SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,   -- bcrypt from the backend, "OAUTH_ONLY" for google users
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'athlete' CHECK (role IN ('athlete','admin')),
  google_sub    TEXT UNIQUE,     -- permanent link to the google account
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sports (
  sport_id SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  icon     TEXT
);

CREATE TABLE programs (
  program_id SERIAL PRIMARY KEY,
  sport_id   INT NOT NULL REFERENCES sports(sport_id),
  name       TEXT NOT NULL,
  location   TEXT,
  day        TEXT,
  start_time TIME,
  end_time   TIME,
  capacity   INT
);

CREATE TABLE plans (
  plan_id       SERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  price_inr     INT NOT NULL CHECK (price_inr > 0),
  description   TEXT
);

CREATE TABLE subscriptions (
  subscription_id SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(user_id),
  plan_id         INT NOT NULL REFERENCES plans(plan_id),
  program_id      INT REFERENCES programs(program_id),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','expired','cancelled')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  invoice_id      SERIAL PRIMARY KEY,
  subscription_id INT NOT NULL REFERENCES subscriptions(subscription_id),
  amount_inr      INT NOT NULL CHECK (amount_inr > 0),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','overdue')),
  issued_at       DATE NOT NULL,
  due_date        DATE
);

CREATE TABLE payments (
  payment_id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(invoice_id),
  amount_inr INT NOT NULL CHECK (amount_inr > 0),
  method     TEXT NOT NULL DEFAULT 'upi',
  txn_ref    TEXT,
  status     TEXT NOT NULL DEFAULT 'initiated'
              CHECK (status IN ('initiated','success','failed')),
  paid_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_programs_sport ON programs(sport_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- ============ seed data ============

INSERT INTO sports (name, icon) VALUES
('Football','⚽'),('Cricket','🏏'),('Basketball','🏀'),('Tennis','🎾'),
('Swimming','🏊'),('Athletics','🏃'),('Badminton','🏸'),('Volleyball','🏐'),
('Table Tennis','🏓'),('Boxing','🥊');

INSERT INTO programs (sport_id, name, location, day, start_time, end_time, capacity) VALUES
((SELECT sport_id FROM sports WHERE name='Football'),'Football Training','Hyderabad Sports Complex','Monday','18:00','20:00',30),
((SELECT sport_id FROM sports WHERE name='Football'),'Football Fitness','Hyderabad Sports Complex','Wednesday','18:00','19:30',25),
((SELECT sport_id FROM sports WHERE name='Cricket'),'Cricket Academy','Bangalore Cricket Ground','Tuesday','17:00','19:30',40),
((SELECT sport_id FROM sports WHERE name='Cricket'),'Cricket Fitness','Bangalore Cricket Ground','Thursday','17:30','19:00',30),
((SELECT sport_id FROM sports WHERE name='Basketball'),'Basketball Training','Chennai Indoor Arena','Monday','17:00','19:00',25),
((SELECT sport_id FROM sports WHERE name='Tennis'),'Tennis Academy','Mumbai Tennis Club','Saturday','07:00','09:00',20),
((SELECT sport_id FROM sports WHERE name='Swimming'),'Swimming Training','Pune Aquatic Centre','Tuesday','06:30','08:00',20),
((SELECT sport_id FROM sports WHERE name='Athletics'),'Athletics Training','Delhi Athletics Stadium','Monday','06:00','08:00',30),
((SELECT sport_id FROM sports WHERE name='Athletics'),'Athletics Fitness','Delhi Athletics Stadium','Friday','06:30','08:00',25),
((SELECT sport_id FROM sports WHERE name='Badminton'),'Badminton Academy','Kochi Indoor Stadium','Wednesday','18:00','20:00',20),
((SELECT sport_id FROM sports WHERE name='Badminton'),'Badminton Fitness','Kochi Indoor Stadium','Saturday','16:00','17:30',20),
((SELECT sport_id FROM sports WHERE name='Volleyball'),'Volleyball Training','Hyderabad Sports Complex','Thursday','18:00','20:00',30),
((SELECT sport_id FROM sports WHERE name='Volleyball'),'Volleyball Fitness','Hyderabad Sports Complex','Saturday','08:00','09:30',25),
((SELECT sport_id FROM sports WHERE name='Table Tennis'),'Table Tennis Academy','Delhi Indoor Sports Hall','Tuesday','18:00','20:00',20),
((SELECT sport_id FROM sports WHERE name='Table Tennis'),'Table Tennis Fitness','Delhi Indoor Sports Hall','Friday','18:00','19:30',20),
((SELECT sport_id FROM sports WHERE name='Boxing'),'Boxing Academy','Pune Boxing Centre','Wednesday','18:00','20:00',20),
((SELECT sport_id FROM sports WHERE name='Boxing'),'Boxing Fitness','Pune Boxing Centre','Sunday','08:00','09:30',25);

INSERT INTO plans (name, billing_cycle, price_inr, description) VALUES
('Basic','monthly',2500,'Flexible access to selected training programs'),
('Premium','monthly',8000,'Extended programs with advanced coaching and longer duration'),
('Fitness','monthly',2500,'Strength, conditioning and sport-specific fitness training');

-- demo logins: admin@sportsphere.com / athlete@example.com
-- password_hash "OAUTH_ONLY" rows log in via google; set real bcrypt hashes
-- for password login before the review
INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('admin','admin@sportsphere.com','OAUTH_ONLY',NULL,'admin'),
('demo athlete','athlete@example.com','OAUTH_ONLY','+91 98765 43210','athlete');
