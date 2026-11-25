# Safar Seats

Train seat and berth booking demo site. Static page: `index.html` plus `hero.jpg`.
Schedules, fares and availability are generated sample data. The login is a demo.

Live site (GitHub Pages): https://vijayarag123.github.io/safar-seats/

## Running the tests

```bash
npm ci
npx playwright install          # first time only
npx playwright test             # all browsers, against the local files
npx playwright test --project=chromium
npx playwright test tests/navigation.spec.js
npx playwright show-report
```

The tests start a small local server themselves, so they check the code in your working folder.
To test the published site instead:

```bash
BASE_URL=https://vijayarag123.github.io/safar-seats/ npx playwright test
```

Sample trains and seat availability are generated from the travel date. Specs that depend on them
call `freezeClock()` from `tests/helpers.js`, which fixes the browser clock at 1 Dec 2026, 9:00 AM IST,
so results do not change from day to day.

| Spec | Covers |
| --- | --- |
| `train-booking.spec.js` | Search, classes, seat and berth rules, concessions, quotas |
| `navigation.spec.js` | `#/results`, `#/seats` ... URLs, Back/Forward, reload keeps seats and hold timer |
| `my-trips.spec.js` | My trips menu, cancellation and refund, berth released after cancelling |
| `departed-trains.spec.js` | Trains that have already left are hidden when searching today |
| `mobile-berth-map.spec.js` | Seat map fits 375px and 360px screens, readable text, compact fare bar |
| `saved-passengers.spec.js` | Save passengers while booking, reuse them, manage them on `#/saved`, per-account list, 20 limit |
| `auth-ui.spec.js` | Show/hide password button, no Agent login, trains only |
| `register.spec.js`, `testcase05.spec.js` | Registration and login |
