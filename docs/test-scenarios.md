# Safar Seats – Train Booking Website: Test Scenarios

Scope: train search, seat/berth booking, payment, cancellation and account flows (no bus booking). Priority: P0 = release blocker, P1 = important, P2 = nice to have. Type: F = functional, N = negative, E = edge, UI, S = security, P = performance, A = accessibility.

## 1. Registration & Login

| ID | Scenario | Type | Pri |
|---|---|---|---|
| AUTH-01 | Register with valid name, email/mobile, password | F | P0 |
| AUTH-02 | Register with an already registered email/mobile shows a clear error | N | P0 |
| AUTH-03 | Password rules enforced (min length, complexity); inline validation messages | N | P1 |
| AUTH-04 | OTP verification: valid OTP, wrong OTP, expired OTP, resend OTP, resend limit | F/N | P0 |
| AUTH-05 | Login with valid credentials lands on the intended page | F | P0 |
| AUTH-06 | Login with wrong password / unregistered user; no hint about which field is wrong | N/S | P0 |
| AUTH-07 | Account lockout or throttling after repeated failed attempts | S | P1 |
| AUTH-08 | Login persists across search, booking and My trips pages without re-login | F | P0 |
| AUTH-09 | Logout in one tab invalidates the session in other tabs | F/S | P1 |
| AUTH-10 | Session expiry mid-booking: user returns to login and booking state is preserved or handled gracefully | E | P1 |
| AUTH-11 | Forgot/reset password: link validity, one-time use, old password stops working | F/S | P1 |
| AUTH-12 | Guest user can search but is asked to log in before booking | F | P0 |
| AUTH-13 | Browser back after logout does not show authenticated pages | S | P1 |

## 2. Train Search & Seat/Berth Booking

| ID | Scenario | Type | Pri |
|---|---|---|---|
| TRN-01 | Search trains by source, destination, date; results show train number, name, timings | F | P0 |
| TRN-02 | Class selection (SL, 3A, 2A, 1A, CC, etc.) shows the right fare and availability | F | P0 |
| TRN-03 | Availability statuses display correctly: Available, RAC, Waitlist (WL), Regret | F | P0 |
| TRN-04 | Booking window rules (advance reservation period) enforced | N/E | P1 |
| TRN-05 | Berth preference (Lower, Middle, Upper, Side Lower, Side Upper) saved with the passenger | F | P0 |
| TRN-06 | Berth allocation is consistent with preference and availability; "no preference" works | F | P1 |
| TRN-07 | Senior citizen / lady / child fare concessions and berth rules applied | F | P1 |
| TRN-08 | Child below age limit booked without a berth, fare logic correct | E | P1 |
| TRN-09 | Waitlisted booking: confirmation text, auto-upgrade, chart-preparation behavior | E | P1 |
| TRN-10 | Quota options (General, Tatkal, Ladies, etc.) and quota timing windows | F/E | P1 |
| TRN-11 | Concurrent booking for the last berth: no double allocation | E | P0 |
| TRN-12 | Sold-out train cannot be booked; waitlist/alternate suggestions shown | N | P1 |

## 3. Passenger Details

| ID | Scenario | Type | Pri |
|---|---|---|---|
| PAX-01 | Mandatory fields validated: name, age, gender, contact, email | N | P0 |
| PAX-02 | Name rules: length, special characters, numbers rejected | N | P1 |
| PAX-03 | Age boundaries: 0, 1, 5, 12, 60, 120, negative, non-numeric | E | P1 |
| PAX-04 | Passenger count matches selected seats/berths | F | P0 |
| PAX-05 | Mobile and email format validation | N | P0 |
| PAX-06 | Saved passenger list: add, edit, delete, autofill | F | P2 |
| PAX-07 | Government ID field (if required) validation and masking | F/S | P1 |
| PAX-08 | Details persist when navigating back from payment | E | P1 |

## 4. Pricing, Offers & Payment

| ID | Scenario | Type | Pri |
|---|---|---|---|
| PAY-01 | Fare breakup: base fare, taxes, convenience fee, discount, total are arithmetically correct | F | P0 |
| PAY-02 | Valid coupon applies; invalid, expired, already used and min-amount coupons rejected | F/N | P1 |
| PAY-03 | Payment via UPI, card, net banking, wallet succeeds and ends in a confirmed booking | F | P0 |
| PAY-04 | Payment failure (declined, insufficient funds) shows an error; seats released; no ticket generated | N | P0 |
| PAY-05 | Payment timeout / user closes the gateway: no charge or an automatic refund; status correct | E | P0 |
| PAY-06 | Money debited but no confirmation (callback delay): reconciliation updates status correctly | E | P0 |
| PAY-07 | Double click on Pay / refresh on the payment page does not create a duplicate charge or booking | E | P0 |
| PAY-08 | Back button during payment does not allow a duplicate booking | E | P1 |
| PAY-09 | Card data never stored in plain text; payment page served over HTTPS | S | P0 |
| PAY-10 | Price tampering via request manipulation is rejected server-side | S | P0 |

## 5. Booking Confirmation & Ticket

| ID | Scenario | Type | Pri |
|---|---|---|---|
| TKT-01 | Confirmation page shows booking ID, seats/berths, passenger, route, timings, amount | F | P0 |
| TKT-02 | Confirmation email and SMS received with correct details | F | P0 |
| TKT-03 | Ticket PDF download renders correctly with QR/barcode | F | P1 |
| TKT-04 | Ticket content matches booking in the DB and operator system | F | P0 |
| TKT-05 | Booking appears under My Bookings (upcoming) | F | P0 |

## 6. Cancellation, Refund & Modification

| ID | Scenario | Type | Pri |
|---|---|---|---|
| CAN-01 | Full cancellation: refund amount follows policy by time-before-departure slab | F | P0 |
| CAN-02 | Partial cancellation of selected passengers; remaining booking remains valid | F | P0 |
| CAN-03 | Cancellation after departure / after chart preparation is blocked or follows the rule | N/E | P1 |
| CAN-04 | Refund goes to the original payment source; status and ETA shown | F | P0 |
| CAN-05 | Cancelled seats/berths return to inventory | F | P0 |
| CAN-06 | Cancelling twice (double click, two tabs) is handled once | E | P1 |
| CAN-07 | Cancellation email/SMS sent | F | P1 |
| CAN-08 | Reschedule/change boarding point (if supported) | F | P2 |

## 7. User Account & My Bookings

| ID | Scenario | Type | Pri |
|---|---|---|---|
| ACC-01 | Profile view/edit; email/mobile change needs re-verification | F | P1 |
| ACC-02 | Booking history: upcoming, completed, cancelled tabs with correct data | F | P1 |
| ACC-03 | A user cannot view another user's booking by changing the ID in the URL | S | P0 |
| ACC-04 | Account deletion/data privacy flows (if offered) | F | P2 |

## 8. Cross-Cutting

| ID | Scenario | Type | Pri |
|---|---|---|---|
| X-01 | Cross-browser: Chrome, Firefox, Safari, Edge | F | P1 |
| X-02 | Responsive layout: mobile, tablet, desktop; no horizontal scroll, keyboard doesn't hide inputs | UI | P0 |
| X-03 | Page load and search response under agreed thresholds; load test on peak search and booking | P | P1 |
| X-04 | Slow/offline network: loaders, retry, no duplicate submissions | E | P1 |
| X-05 | Keyboard navigation, focus order, labels, contrast, screen-reader support on search and booking forms | A | P2 |
| X-06 | Security: XSS, SQLi, CSRF, IDOR, rate limiting on OTP/login/search APIs, secure cookies | S | P0 |
| X-07 | Error pages (404, 500) are friendly and don't leak stack traces | N/S | P2 |
| X-08 | Time zone and date formatting consistent (IST), including overnight journeys and midnight departures | E | P1 |
| X-09 | Localization / currency formatting (₹, thousands separators) | UI | P2 |
| X-10 | Support/contact and help pages, T&C and cancellation policy links work | F | P2 |

## 9. Suggested Automation Candidates (Playwright)

- Smoke (P0): login, train search, class and berth select, passenger details, payment (test gateway), confirmation, cancel.
- API-level: berth lock/release, concurrent last-berth booking, fare calculation, coupon rules.
- Reuse one authenticated storage state across suites to skip repeated logins.
