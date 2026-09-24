-- SportSphere : schema v1 (MySQL)
-- modules: user mgmt, sports, programs, plans, subscriptions, billing, admin

CREATE DATABASE IF NOT EXISTS sportsphere;
USE sportsphere;

CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,   -- bcrypt from the backend, "OAUTH_ONLY" for google users
  phone         VARCHAR(20),
  role          ENUM('athlete','admin') NOT NULL DEFAULT 'athlete',
  google_sub    VARCHAR(255) UNIQUE,     -- permanent link to the google account
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sports (
  sport_id INT AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(50) NOT NULL UNIQUE,
  icon     VARCHAR(10)
);

CREATE TABLE programs (
  program_id INT AUTO_INCREMENT PRIMARY KEY,
  sport_id   INT NOT NULL,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(150),
  day        VARCHAR(15),
  start_time TIME,
  end_time   TIME,
  capacity   INT,
  FOREIGN KEY (sport_id) REFERENCES sports(sport_id)
);

CREATE TABLE plans (
  plan_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL UNIQUE,
  billing_cycle ENUM('monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
  price_inr     INT NOT NULL,
  description   TEXT
);

CREATE TABLE subscriptions (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  plan_id         INT NOT NULL,
  program_id      INT,
  status          ENUM('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
  FOREIGN KEY (program_id) REFERENCES programs(program_id)
);

CREATE TABLE invoices (
  invoice_id      INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  amount_inr      INT NOT NULL,
  status          ENUM('pending','paid','overdue') NOT NULL DEFAULT 'pending',
  issued_at       DATE NOT NULL,
  due_date        DATE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id)
);

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  amount_inr INT NOT NULL,
  method     VARCHAR(20) DEFAULT 'upi',
  txn_ref    VARCHAR(100),
  status     ENUM('initiated','success','failed') NOT NULL DEFAULT 'initiated',
  paid_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
);

-- ============ seed data ============

INSERT INTO sports (name, icon) VALUES
('Football','⚽'),('Cricket','🏏'),('Basketball','🏀'),('Tennis','🎾'),
('Swimming','🏊'),('Athletics','🏃'),('Badminton','🏸'),('Volleyball','🏐'),
('Table Tennis','🏓'),('Boxing','🥊');

INSERT INTO programs (sport_id, name, location, day, start_time, end_time, capacity) VALUES
((SELECT sport_id FROM sports WHERE name='Football'),'Football Training','Hyderabad Sports Complex','Monday','18:00:00','20:00:00',30),
((SELECT sport_id FROM sports WHERE name='Football'),'Football Fitness','Hyderabad Sports Complex','Wednesday','18:00:00','19:30:00',25),
((SELECT sport_id FROM sports WHERE name='Cricket'),'Cricket Academy','Bangalore Cricket Ground','Tuesday','17:00:00','19:30:00',40),
((SELECT sport_id FROM sports WHERE name='Cricket'),'Cricket Fitness','Bangalore Cricket Ground','Thursday','17:30:00','19:00:00',30),
((SELECT sport_id FROM sports WHERE name='Basketball'),'Basketball Training','Chennai Indoor Arena','Monday','17:00:00','19:00:00',25),
((SELECT sport_id FROM sports WHERE name='Tennis'),'Tennis Academy','Mumbai Tennis Club','Saturday','07:00:00','09:00:00',20),
((SELECT sport_id FROM sports WHERE name='Swimming'),'Swimming Training','Pune Aquatic Centre','Tuesday','06:30:00','08:00:00',20),
((SELECT sport_id FROM sports WHERE name='Athletics'),'Athletics Training','Delhi Athletics Stadium','Monday','06:00:00','08:00:00',30),
((SELECT sport_id FROM sports WHERE name='Athletics'),'Athletics Fitness','Delhi Athletics Stadium','Friday','06:30:00','08:00:00',25),
((SELECT sport_id FROM sports WHERE name='Badminton'),'Badminton Academy','Kochi Indoor Stadium','Wednesday','18:00:00','20:00:00',20),
((SELECT sport_id FROM sports WHERE name='Badminton'),'Badminton Fitness','Kochi Indoor Stadium','Saturday','16:00:00','17:30:00',20),
((SELECT sport_id FROM sports WHERE name='Volleyball'),'Volleyball Training','Hyderabad Sports Complex','Thursday','18:00:00','20:00:00',30),
((SELECT sport_id FROM sports WHERE name='Volleyball'),'Volleyball Fitness','Hyderabad Sports Complex','Saturday','08:00:00','09:30:00',25),
((SELECT sport_id FROM sports WHERE name='Table Tennis'),'Table Tennis Academy','Delhi Indoor Sports Hall','Tuesday','18:00:00','20:00:00',20),
((SELECT sport_id FROM sports WHERE name='Table Tennis'),'Table Tennis Fitness','Delhi Indoor Sports Hall','Friday','18:00:00','19:30:00',20),
((SELECT sport_id FROM sports WHERE name='Boxing'),'Boxing Academy','Pune Boxing Centre','Wednesday','18:00:00','20:00:00',20),
((SELECT sport_id FROM sports WHERE name='Boxing'),'Boxing Fitness','Pune Boxing Centre','Sunday','08:00:00','09:30:00',25);

INSERT INTO plans (name, billing_cycle, price_inr, description) VALUES
('Basic','monthly',2500,'Flexible access to selected training programs'),
('Premium','monthly',8000,'Extended programs with advanced coaching and longer duration'),
('Fitness','monthly',2500,'Strength, conditioning and sport-specific fitness training');

-- demo logins: admin@sportsphere.com / athlete@example.com
-- replace hashes with real bcrypt output from the backend before the review
INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('admin','admin@sportsphere.com','$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH',NULL,'admin'),
('demo athlete','athlete@example.com','$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH','+91 98765 43210','athlete');
