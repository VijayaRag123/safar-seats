-- =====================================================================
-- Safar Seats (train booking) - database test data
-- Standard SQL: runs on MySQL, PostgreSQL and SQLite. Explicit IDs, no auto-increment.
-- Sections: 1) schema  2) clean test data  3) verification queries
--           4) negative inserts (each should FAIL)
-- Adjust table/column names to match your real schema.
-- =====================================================================

-- ---------- 1. SCHEMA ----------
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS passengers;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS class_inventory;
DROP TABLE IF EXISTS journeys;
DROP TABLE IF EXISTS trains;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id       INTEGER PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  mobile        VARCHAR(15)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  is_verified   INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0,1)),
  status        VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED','DELETED')),
  failed_logins INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL
);

CREATE TABLE stations (
  station_code VARCHAR(5) PRIMARY KEY,
  station_name VARCHAR(100) NOT NULL,
  state        VARCHAR(50) NOT NULL
);

CREATE TABLE trains (
  train_no    VARCHAR(6) PRIMARY KEY,
  train_name  VARCHAR(100) NOT NULL,
  source_code VARCHAR(5) NOT NULL REFERENCES stations(station_code),
  dest_code   VARCHAR(5) NOT NULL REFERENCES stations(station_code),
  CHECK (source_code <> dest_code)
);

CREATE TABLE journeys (
  journey_id     INTEGER PRIMARY KEY,
  train_no       VARCHAR(6) NOT NULL REFERENCES trains(train_no),
  journey_date   DATE NOT NULL,
  departure_time VARCHAR(5) NOT NULL,
  arrival_time   VARCHAR(5) NOT NULL,
  UNIQUE (train_no, journey_date)
);

CREATE TABLE class_inventory (
  inv_id              INTEGER PRIMARY KEY,
  journey_id          INTEGER NOT NULL REFERENCES journeys(journey_id),
  class_code          VARCHAR(3) NOT NULL CHECK (class_code IN ('SL','3A','2A','1A','CC')),
  total_seats         INTEGER NOT NULL CHECK (total_seats > 0),
  available_seats     INTEGER NOT NULL,
  rac_count           INTEGER NOT NULL DEFAULT 0,
  wl_count            INTEGER NOT NULL DEFAULT 0,
  availability_status VARCHAR(10) NOT NULL CHECK (availability_status IN ('AVAILABLE','RAC','WL','REGRET')),
  fare                DECIMAL(10,2) NOT NULL CHECK (fare > 0),
  UNIQUE (journey_id, class_code),
  CHECK (available_seats >= 0 AND available_seats <= total_seats)
);

CREATE TABLE bookings (
  booking_id      INTEGER PRIMARY KEY,
  pnr             VARCHAR(10) NOT NULL UNIQUE,
  user_id         INTEGER NOT NULL REFERENCES users(user_id),
  journey_id      INTEGER NOT NULL REFERENCES journeys(journey_id),
  class_code      VARCHAR(3) NOT NULL,
  quota           VARCHAR(10) NOT NULL DEFAULT 'GENERAL' CHECK (quota IN ('GENERAL','TATKAL','LADIES','SENIOR')),
  status          VARCHAR(10) NOT NULL CHECK (status IN ('CONFIRMED','RAC','WL','CANCELLED','PARTIAL_CAN','FAILED','PENDING')),
  convenience_fee DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  total_amount    DECIMAL(10,2) NOT NULL,
  booked_at       TIMESTAMP NOT NULL
);

CREATE TABLE passengers (
  passenger_id    INTEGER PRIMARY KEY,
  booking_id      INTEGER NOT NULL REFERENCES bookings(booking_id),
  name            VARCHAR(100) NOT NULL,
  age             INTEGER NOT NULL CHECK (age >= 0 AND age <= 120),
  gender          VARCHAR(1) NOT NULL CHECK (gender IN ('M','F','T')),
  berth_pref      VARCHAR(5),   -- LB, MB, UB, SL, SU, NONE
  berth_allocated VARCHAR(10),  -- e.g. S4/23/LB, NULL if not allotted
  seat_status     VARCHAR(10) NOT NULL CHECK (seat_status IN ('CNF','RAC','WL','CAN','NO_BERTH')),
  concession      VARCHAR(10) NOT NULL DEFAULT 'NONE' CHECK (concession IN ('NONE','SENIOR','CHILD'))
);

CREATE TABLE payments (
  payment_id     INTEGER PRIMARY KEY,
  booking_id     INTEGER NOT NULL REFERENCES bookings(booking_id),
  gateway_txn_id VARCHAR(30) NOT NULL UNIQUE,
  method         VARCHAR(10) NOT NULL CHECK (method IN ('UPI','CARD','NETBANKING','WALLET')),
  amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status         VARCHAR(10) NOT NULL CHECK (status IN ('SUCCESS','FAILED','PENDING','REFUNDED')),
  paid_at        TIMESTAMP NOT NULL
);

CREATE TABLE refunds (
  refund_id     INTEGER PRIMARY KEY,
  booking_id    INTEGER NOT NULL REFERENCES bookings(booking_id),
  payment_id    INTEGER NOT NULL REFERENCES payments(payment_id),
  refund_amount DECIMAL(10,2) NOT NULL CHECK (refund_amount >= 0),
  status        VARCHAR(10) NOT NULL CHECK (status IN ('INITIATED','PROCESSED','FAILED')),
  reason        VARCHAR(100),
  refund_date   TIMESTAMP NOT NULL
);

-- ---------- 2. TEST DATA ----------

-- Users (verified, unverified, locked, deleted, special characters in name)
INSERT INTO users VALUES
(1,  'Arun Kumar',        'arun.kumar@example.com',   '9000000001', 'hash_a1', 1, 'ACTIVE',  0, '2026-10-01 09:00:00'),
(2,  'Priya Sharma',      'priya.sharma@example.com', '9000000002', 'hash_a2', 1, 'ACTIVE',  0, '2026-10-02 10:15:00'),
(3,  'Karthik Raja',      'karthik.raja@example.com', '9000000003', 'hash_a3', 1, 'ACTIVE',  0, '2026-10-05 11:30:00'),
(4,  'Meena Lakshmi',     'meena.l@example.com',      '9000000004', 'hash_a4', 1, 'ACTIVE',  0, '2026-10-07 08:45:00'),
(5,  'Ravi Shankar',      'ravi.s@example.com',       '9000000005', 'hash_a5', 0, 'ACTIVE',  0, '2026-11-10 14:00:00'),  -- unverified
(6,  'Sneha Iyer',        'sneha.iyer@example.com',   '9000000006', 'hash_a6', 1, 'LOCKED',  5, '2026-10-12 16:20:00'),  -- locked after 5 failed logins
(7,  'Mohammed Faizal',   'faizal.m@example.com',     '9000000007', 'hash_a7', 1, 'ACTIVE',  1, '2026-10-15 13:10:00'),
(8,  'Deepa O''Connor',   'deepa.oc@example.com',     '9000000008', 'hash_a8', 1, 'ACTIVE',  0, '2026-10-20 17:00:00'),  -- apostrophe in name
(9,  'Gopal Krishnan',    'gopal.k@example.com',      '9000000009', 'hash_a9', 1, 'DELETED', 0, '2026-09-01 12:00:00'),
(10, 'Anitha Venkatesh',  'anitha.v@example.com',     '9000000010', 'hash_b1', 1, 'ACTIVE',  0, '2026-11-18 19:30:00');

-- Stations
INSERT INTO stations VALUES
('MAS', 'Chennai Central',            'Tamil Nadu'),
('SBC', 'KSR Bengaluru City Jn',      'Karnataka'),
('CBE', 'Coimbatore Jn',              'Tamil Nadu'),
('MDU', 'Madurai Jn',                 'Tamil Nadu'),
('HYB', 'Hyderabad Deccan',           'Telangana'),
('NDLS','New Delhi',                  'Delhi'),
('BCT', 'Mumbai Central',             'Maharashtra'),
('TVC', 'Thiruvananthapuram Central', 'Kerala');

-- Trains
INSERT INTO trains VALUES
('12601', 'Chennai Bengaluru Express', 'MAS', 'SBC'),
('12602', 'Bengaluru Chennai Express', 'SBC', 'MAS'),
('12671', 'Kovai Superfast',            'MAS', 'CBE'),
('12631', 'Pandian Express',           'MAS', 'MDU'),
('12759', 'Charminar Link',            'MAS', 'HYB'),
('12433', 'Rajdhani Link',             'MAS', 'NDLS');

-- Journeys (1 past date, 1 today, rest future; today = 2026-11-26)
INSERT INTO journeys VALUES
(1,  '12601', '2026-11-20', '06:00', '11:30'),  -- past date
(2,  '12601', '2026-11-26', '06:00', '11:30'),  -- today
(3,  '12601', '2026-12-05', '06:00', '11:30'),
(4,  '12602', '2026-12-05', '15:00', '20:45'),
(5,  '12671', '2026-12-05', '22:00', '05:30'),  -- overnight
(6,  '12631', '2026-12-06', '21:15', '06:10'),  -- overnight
(7,  '12759', '2026-12-06', '18:30', '06:40'),  -- overnight
(8,  '12433', '2026-12-10', '22:30', '06:00'),  -- overnight
(9,  '12433', '2026-12-11', '22:30', '06:00'),
(10, '12601', '2026-12-31', '06:00', '11:30'),  -- far future / year-end
(11, '12631', '2026-12-07', '21:15', '06:10'),
(12, '12671', '2026-12-08', '22:00', '05:30');

-- Class inventory: covers AVAILABLE, RAC, WL and REGRET
INSERT INTO class_inventory VALUES
(1,  3,  'SL', 72, 42, 0, 0,  'AVAILABLE', 190.00),
(2,  3,  '3A', 64, 10, 0, 0,  'AVAILABLE', 520.00),
(3,  3,  '2A', 48, 0,  6, 0,  'RAC',       740.00),
(4,  3,  'CC', 78, 0,  0, 12, 'WL',        650.00),
(5,  4,  'SL', 72, 0,  0, 0,  'REGRET',    190.00),
(6,  4,  '3A', 64, 1,  0, 0,  'AVAILABLE', 520.00),   -- last seat (concurrency test)
(7,  5,  'SL', 72, 60, 0, 0,  'AVAILABLE', 310.00),
(8,  5,  '2A', 48, 4,  0, 0,  'AVAILABLE', 1150.00),
(9,  6,  'SL', 72, 0,  0, 25, 'WL',        280.00),
(10, 6,  '3A', 64, 22, 0, 0,  'AVAILABLE', 760.00),
(11, 7,  '3A', 64, 30, 0, 0,  'AVAILABLE', 980.00),
(12, 7,  '1A', 24, 2,  0, 0,  'AVAILABLE', 2400.00),
(13, 8,  '3A', 64, 0,  0, 0,  'REGRET',    1850.00),
(14, 8,  '2A', 48, 8,  0, 0,  'AVAILABLE', 2650.00),
(15, 9,  '3A', 64, 50, 0, 0,  'AVAILABLE', 1850.00),
(16, 10, 'CC', 78, 70, 0, 0,  'AVAILABLE', 650.00),
(17, 1,  'SL', 72, 5,  0, 0,  'AVAILABLE', 190.00),
(18, 2,  'SL', 72, 20, 0, 0,  'AVAILABLE', 190.00),
(19, 11, 'SL', 72, 0,  0, 2,  'WL',        280.00),
(20, 12, 'CC', 78, 40, 0, 0,  'AVAILABLE', 540.00);

-- Bookings (total = fare * passengers + convenience_fee)
INSERT INTO bookings VALUES
(1,  'PNR1000001', 1,  3,  'SL', 'GENERAL', 'CONFIRMED',   20.00, 400.00,  '2026-11-21 10:00:00'),  -- 2 pax SL
(2,  'PNR1000002', 2,  3,  '3A', 'GENERAL', 'CONFIRMED',   20.00, 1580.00, '2026-11-21 11:30:00'),  -- 3 pax 3A
(3,  'PNR1000003', 3,  3,  '2A', 'GENERAL', 'RAC',         20.00, 760.00,  '2026-11-22 09:15:00'),  -- 1 pax RAC
(4,  'PNR1000004', 4,  3,  'CC', 'GENERAL', 'WL',          20.00, 670.00,  '2026-11-22 14:40:00'),  -- 1 pax WL
(5,  'PNR1000005', 1,  5,  'SL', 'TATKAL',  'CONFIRMED',   20.00, 640.00,  '2026-11-23 08:00:00'),  -- 2 pax, tatkal
(6,  'PNR1000006', 7,  5,  '2A', 'GENERAL', 'CANCELLED',   20.00, 3470.00, '2026-11-23 12:00:00'),  -- fully cancelled, 3 pax
(7,  'PNR1000007', 8,  7,  '3A', 'LADIES',  'CONFIRMED',   20.00, 1980.00, '2026-11-24 10:20:00'),
(8,  'PNR1000008', 2,  7,  '1A', 'GENERAL', 'PARTIAL_CAN', 20.00, 4820.00, '2026-11-24 16:00:00'),  -- 2 pax, 1 cancelled
(9,  'PNR1000009', 10, 9,  '3A', 'SENIOR',  'CONFIRMED',   20.00, 3720.00, '2026-11-25 09:00:00'),
(10, 'PNR1000010', 3,  4,  '3A', 'GENERAL', 'FAILED',     20.00, 540.00,  '2026-11-25 11:00:00'),  -- payment failed
(11, 'PNR1000011', 4,  6,  '3A', 'GENERAL', 'PENDING',    20.00, 780.00,  '2026-11-26 10:00:00'),  -- gateway timeout, awaiting reconciliation
(12, 'PNR1000012', 7,  2,  'SL', 'GENERAL', 'CONFIRMED',   20.00, 210.00,  '2026-11-26 07:30:00');  -- same-day travel

-- Passengers (age boundaries 4,5,12,60,80; all genders; all berth prefs)
INSERT INTO passengers VALUES
(1,  1,  'Arun Kumar',        34, 'M', 'LB',   'S4/23/LB', 'CNF',      'NONE'),
(2,  1,  'Kavitha Arun',      31, 'F', 'LB',   'S4/24/LB', 'CNF',      'NONE'),
(3,  2,  'Priya Sharma',      29, 'F', 'LB',   'B2/11/LB', 'CNF',      'NONE'),
(4,  2,  'Suresh Sharma',     62, 'M', 'LB',   'B2/12/MB', 'CNF',      'SENIOR'),
(5,  2,  'Aarav Sharma',      12, 'M', 'UB',   'B2/13/UB', 'CNF',      'NONE'),   -- boundary age 12
(6,  3,  'Karthik Raja',      41, 'M', 'UB',   'RAC/1',    'RAC',      'NONE'),
(7,  4,  'Meena Lakshmi',     38, 'F', 'NONE', NULL,       'WL',       'NONE'),
(8,  5,  'Arun Kumar',        34, 'M', 'MB',   'S7/40/MB', 'CNF',      'NONE'),
(9,  5,  'Divya Kumar',       4,  'F', 'NONE', NULL,       'NO_BERTH', 'CHILD'),  -- child without berth (age 4)
(10, 6,  'Mohammed Faizal',   45, 'M', 'LB',   NULL,       'CAN',      'NONE'),
(11, 6,  'Ayesha Faizal',     40, 'F', 'LB',   NULL,       'CAN',      'NONE'),
(12, 6,  'Zayn Faizal',       5,  'M', 'UB',   NULL,       'CAN',      'NONE'),   -- boundary age 5
(13, 7,  'Deepa O''Connor',   36, 'F', 'SL',   'B1/9/SL',  'CNF',      'NONE'),
(14, 7,  'Maya O''Connor',    60, 'F', 'SU',   'B1/10/SU', 'CNF',      'SENIOR'), -- boundary age 60
(15, 8,  'Priya Sharma',      29, 'F', 'LB',   NULL,       'CAN',      'NONE'),   -- cancelled passenger
(16, 8,  'Lalitha Sharma',    80, 'F', 'LB',   'H1/3/LB',  'CNF',      'SENIOR'),
(17, 9,  'Anitha Venkatesh',  58, 'F', 'LB',   'B3/5/LB',  'CNF',      'NONE'),
(18, 9,  'Venkatesh R',       64, 'M', 'LB',   'B3/6/LB',  'CNF',      'SENIOR'),
(19, 10, 'Karthik Raja',      41, 'M', 'LB',   NULL,       'WL',       'NONE'),
(20, 11, 'Meena Lakshmi',     38, 'F', 'MB',   NULL,       'WL',       'NONE'),
(21, 12, 'Mohammed Faizal',   45, 'M', 'NONE', 'S2/18/SU', 'CNF',      'NONE');

-- Payments (success, failed, pending, refunded, multiple methods, duplicate-attempt scenario)
INSERT INTO payments VALUES
(1,  1,  'TXN2026112100001', 'UPI',        400.00,  'SUCCESS',  '2026-11-21 10:02:00'),
(2,  2,  'TXN2026112100002', 'CARD',       1580.00, 'SUCCESS',  '2026-11-21 11:33:00'),
(3,  3,  'TXN2026112200003', 'NETBANKING', 760.00,  'SUCCESS',  '2026-11-22 09:17:00'),
(4,  4,  'TXN2026112200004', 'WALLET',     670.00,  'SUCCESS',  '2026-11-22 14:42:00'),
(5,  5,  'TXN2026112300005', 'UPI',        640.00,  'SUCCESS',  '2026-11-23 08:01:00'),
(6,  6,  'TXN2026112300006', 'CARD',       3470.00, 'REFUNDED', '2026-11-23 12:02:00'),
(7,  7,  'TXN2026112400007', 'UPI',        1980.00, 'SUCCESS',  '2026-11-24 10:22:00'),
(8,  8,  'TXN2026112400008', 'CARD',       4820.00, 'SUCCESS',  '2026-11-24 16:03:00'),
(9,  9,  'TXN2026112500009', 'UPI',        3720.00, 'SUCCESS',  '2026-11-25 09:02:00'),
(10, 10, 'TXN2026112500010', 'CARD',       540.00,  'FAILED',   '2026-11-25 11:01:00'),
(11, 11, 'TXN2026112600011', 'UPI',        780.00,  'PENDING',  '2026-11-26 10:01:00'),
(12, 12, 'TXN2026112600012', 'UPI',        210.00,  'SUCCESS',  '2026-11-26 07:31:00');

-- Refunds (full cancellation, partial cancellation)
INSERT INTO refunds VALUES
(1, 6, 6, 3300.00, 'PROCESSED', 'Full cancellation by user',        '2026-11-23 18:00:00'),
(2, 8, 8, 2200.00, 'INITIATED', 'Partial cancellation - 1 passenger', '2026-11-25 10:00:00');

-- ---------- 3. VERIFICATION QUERIES (each should return 0 rows unless noted) ----------

-- V1. Booking total must equal fare * passenger count + convenience fee
SELECT b.booking_id, b.total_amount,
       (ci.fare * COUNT(p.passenger_id) + b.convenience_fee) AS expected
FROM bookings b
JOIN class_inventory ci ON ci.journey_id = b.journey_id AND ci.class_code = b.class_code
JOIN passengers p ON p.booking_id = b.booking_id
GROUP BY b.booking_id, b.total_amount, ci.fare, b.convenience_fee
HAVING b.total_amount <> (ci.fare * COUNT(p.passenger_id) + b.convenience_fee);

-- V2. Successful payment amount must equal booking total
SELECT p.payment_id, p.amount, b.total_amount
FROM payments p JOIN bookings b ON b.booking_id = p.booking_id
WHERE p.status IN ('SUCCESS','REFUNDED') AND p.amount <> b.total_amount;

-- V3. CONFIRMED booking must have a SUCCESS payment
SELECT b.booking_id FROM bookings b
WHERE b.status = 'CONFIRMED'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.booking_id AND p.status = 'SUCCESS');

-- V4. FAILED booking must not have a SUCCESS payment, and no berth allotted
SELECT b.booking_id FROM bookings b
WHERE b.status = 'FAILED'
  AND EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.booking_id AND p.status = 'SUCCESS');

-- V5. Every CONFIRMED passenger has a berth; WL/CAN passengers have none
SELECT passenger_id FROM passengers
WHERE (seat_status = 'CNF' AND berth_allocated IS NULL)
   OR (seat_status IN ('WL','CAN') AND berth_allocated IS NOT NULL);

-- V6. No berth allotted twice on the same journey (duplicate allocation)
SELECT b.journey_id, p.berth_allocated, COUNT(*) AS times_allotted
FROM passengers p JOIN bookings b ON b.booking_id = p.booking_id
WHERE p.berth_allocated IS NOT NULL AND p.seat_status = 'CNF'
GROUP BY b.journey_id, p.berth_allocated
HAVING COUNT(*) > 1;

-- V7. Refund must not exceed the amount paid
SELECT r.refund_id FROM refunds r JOIN payments p ON p.payment_id = r.payment_id
WHERE r.refund_amount > p.amount;

-- V8. Cancelled booking must have a refund record
SELECT b.booking_id FROM bookings b
WHERE b.status = 'CANCELLED' AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.booking_id = b.booking_id);

-- V9. Availability status must match the counts in class_inventory
SELECT inv_id FROM class_inventory
WHERE (availability_status = 'AVAILABLE' AND available_seats = 0)
   OR (availability_status = 'WL'        AND available_seats > 0)
   OR (availability_status = 'RAC'       AND rac_count = 0);

-- V10. Locked or deleted users must not have bookings made after lock/deletion (review manually)
SELECT u.user_id, u.status, COUNT(b.booking_id) AS bookings
FROM users u LEFT JOIN bookings b ON b.user_id = u.user_id
WHERE u.status <> 'ACTIVE' GROUP BY u.user_id, u.status;   -- expected: rows with 0 bookings

-- V11. Booking count per status (reporting check, expected: 6 CONFIRMED, 1 each of RAC, WL, CANCELLED, PARTIAL_CAN, FAILED, PENDING)
SELECT status, COUNT(*) FROM bookings GROUP BY status;

-- V12. Orphan check: passengers/payments without a parent booking
SELECT passenger_id FROM passengers WHERE booking_id NOT IN (SELECT booking_id FROM bookings);
SELECT payment_id   FROM payments   WHERE booking_id NOT IN (SELECT booking_id FROM bookings);

-- ---------- 4. NEGATIVE INSERTS (run one at a time; each should be REJECTED) ----------
-- N1 duplicate email:        INSERT INTO users VALUES (11,'Dup User','arun.kumar@example.com','9000000011','h',1,'ACTIVE',0,'2026-11-26 10:00:00');
-- N2 duplicate mobile:       INSERT INTO users VALUES (11,'Dup User','dup@example.com','9000000001','h',1,'ACTIVE',0,'2026-11-26 10:00:00');
-- N3 same source/dest train: INSERT INTO trains VALUES ('99999','Bad Train','MAS','MAS');
-- N4 invalid class:          INSERT INTO class_inventory VALUES (99,3,'XX',10,5,0,0,'AVAILABLE',100.00);
-- N5 available > total:      INSERT INTO class_inventory VALUES (99,3,'1A',24,30,0,0,'AVAILABLE',2400.00);
-- N6 negative age:           INSERT INTO passengers VALUES (99,1,'Bad Age',-1,'M','LB',NULL,'WL','NONE');
-- N7 age above 120:          INSERT INTO passengers VALUES (99,1,'Bad Age',121,'M','LB',NULL,'WL','NONE');
-- N8 booking for no user:    INSERT INTO bookings VALUES (99,'PNR1000099',999,3,'SL','GENERAL','CONFIRMED',20.00,210.00,'2026-11-26 10:00:00');
-- N9 duplicate PNR:          INSERT INTO bookings VALUES (99,'PNR1000001',1,3,'SL','GENERAL','CONFIRMED',20.00,210.00,'2026-11-26 10:00:00');
-- N10 duplicate txn id:      INSERT INTO payments VALUES (99,1,'TXN2026112100001','UPI',400.00,'SUCCESS','2026-11-26 10:00:00');
-- N11 zero/negative amount:  INSERT INTO payments VALUES (99,1,'TXN_NEG','UPI',-5.00,'SUCCESS','2026-11-26 10:00:00');
-- N12 invalid status:        INSERT INTO bookings VALUES (99,'PNR1000098',1,3,'SL','GENERAL','DONE',20.00,210.00,'2026-11-26 10:00:00');
-- N13 duplicate journey:     INSERT INTO journeys VALUES (99,'12601','2026-12-05','06:00','11:30');
-- N14 delete parent w/ children: DELETE FROM bookings WHERE booking_id = 1;   -- should fail (FK) when FK enforcement is on
