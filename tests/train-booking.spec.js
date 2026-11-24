import { test, expect } from '@playwright/test';
import { freezeClock } from './helpers.js';

const appUrl = './';

// Results and availability are generated from the date, so every test starts on the same day.
test.beforeEach(async ({ page }) => {
  await freezeClock(page);
});

async function searchTrains(page, { from = 'Chennai', to = 'Bengaluru' } = {}) {
  await page.goto(appUrl);
  const date = page.getByRole('textbox', { name: 'Date' });
  const travelDate = await date.inputValue();

  await page.getByRole('combobox', { name: 'From' }).fill(from);
  await page.getByRole('combobox', { name: 'To' }).fill(to);
  await date.fill(travelDate);
  await page.getByRole('button', { name: 'Search trains' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();

  return travelDate;
}

async function openAvailableSleeperSeats(page) {
  await searchTrains(page);
  await page.getByRole('button', { name: /^SL ₹.*Available/ }).first().click();
  await expect(page.getByRole('heading', { name: /Choose seats in Sleeper/ })).toBeVisible();
}

test('searches by source, destination, and date and shows train details', async ({ page }) => {
  const travelDate = await searchTrains(page, { from: 'Chennai', to: 'Madurai' });

  expect(travelDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText(/Chennai → Madurai · .+ · 1 passenger/)).toBeVisible();

  const firstTrain = page.getByRole('article').first();
  await expect(firstTrain.getByRole('heading')).toBeVisible();
  await expect(firstTrain).toContainText(/\d{5}/);
  await expect(firstTrain).toContainText(/\d{2}:\d{2} (AM|PM)/);
});

test('class selection shows its fare and availability', async ({ page }) => {
  await searchTrains(page);

  for (const classCode of ['SL', '3A', '2A', '1A', 'CC']) {
    const classOption = page.getByRole('button', { name: new RegExp(`^${classCode} ₹`) }).first();
    await expect(classOption).toBeVisible();
    await expect(classOption).toContainText(/₹[\d,]+/);
    await expect(classOption).toContainText(/(Available \d+|RAC \d+|WL \d+)/);
  }

  // Only a class with seats available opens the seat map (RAC and WL go straight to passenger details).
  const threeATrain = page.getByRole('button', { name: /^3A ₹.*Available \d+/ }).first();
  await expect(threeATrain).toBeVisible();
  const trainClassAndFare = await threeATrain.innerText();
  const fare = trainClassAndFare.match(/₹[\d,]+/)?.[0];
  expect(fare).toBeTruthy();

  await threeATrain.click();
  await expect(page.getByRole('heading', { name: /Choose seats in/ })).toBeVisible();
  await expect(page.locator('body')).toContainText('AC 3 Tier');
  await expect(page.locator('body')).toContainText(fare);
});

test('availability results distinguish Available, RAC, and WL', async ({ page }) => {
  await searchTrains(page);

  await expect(page.getByRole('button', { name: /Available \d+/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /RAC \d+/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /WL \d+/ }).first()).toBeVisible();
});

test('enforces the advance reservation booking window', async ({ page }) => {
  test.fixme(true, 'The demo search does not enforce or display an advance-reservation limit.');

  await searchTrains(page);
  const date = page.getByRole('textbox', { name: 'Date' });
  await date.fill('2099-12-31');
  await page.getByRole('button', { name: 'Search trains' }).click();
  await expect(page.getByText(/outside the booking window|maximum advance reservation/i)).toBeVisible();
});

test('displays Regret when a class has no bookable or waitlist availability', async ({ page }) => {
  test.fixme(true, 'The published demo search data does not currently include a Regret status.');

  await searchTrains(page);
  await expect(page.getByRole('button', { name: /Regret/i }).first()).toBeVisible();
});

test('saves the selected berth preference with the passenger', async ({ page }) => {
  await openAvailableSleeperSeats(page);

  // The preference is applied by Auto-assign, so choose LB and let the app assign the berth.
  await page.getByLabel('Berth preference').selectOption('LB');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();

  await expect(page.getByRole('group')).toContainText(/Passenger 1 · S\d+\/\d+ LB/);
});

test('picking a lower berth by hand is saved with the passenger', async ({ page }) => {
  await openAvailableSleeperSeats(page);

  const lowerBerth = page.locator(
    'button[data-act="seat"]:not([disabled])[aria-label*="Lower berth"]',
  ).first();
  await lowerBerth.click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();

  await expect(page.getByRole('group')).toContainText(/Passenger 1 · S\d+\/\d+ LB/);
});

test('auto-assigns a berth when no berth preference is selected', async ({ page }) => {
  await openAvailableSleeperSeats(page);

  const preference = page.getByLabel('Berth preference');
  await expect(preference).toHaveValue('Any');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  await expect(page.getByRole('button', { name: /Continue with 1 seat/ })).toBeEnabled();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();

  await expect(page.getByRole('group')).toContainText(/Passenger 1 · S\d+\/\d+/);
});

test('applies senior, lady, and child concession and berth rules', async ({ page }) => {
  test.fixme(true, 'The demo passenger flow has no concession or special-berth rule feedback.');

  await openAvailableSleeperSeats(page);
  await page.locator('button[data-act="seat"]:not([disabled])').first().click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();
  await expect(page.getByText(/concession|special berth/i)).toBeVisible();
});

test('books a child below the berth age limit without assigning a berth', async ({ page }) => {
  test.fixme(true, 'The demo does not expose a child-without-berth or child-fare booking option.');

  await openAvailableSleeperSeats(page);
  await page.locator('button[data-act="seat"]:not([disabled])').first().click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();
  await page.getByRole('textbox', { name: 'Age' }).fill('4');
  await expect(page.getByText(/without berth/i)).toBeVisible();
});

test('shows waitlist confirmation, auto-upgrade, and chart-preparation behavior', async ({ page }) => {
  test.fixme(true, 'The demo displays WL results but does not support waitlist booking or chart preparation.');

  await searchTrains(page);
  await page.getByRole('button', { name: /WL \d+/ }).first().click();
  await expect(page.getByText(/waitlist booking confirmed/i)).toBeVisible();
});

test('offers quota options and enforces quota booking windows', async ({ page }) => {
  test.fixme(true, 'The search and booking flow does not expose quota selection or quota timing.');

  await searchTrains(page);
  await expect(page.getByRole('combobox', { name: /Quota/i })).toBeVisible();
});

test('prevents two concurrent bookings from taking the last berth', async ({ browser }) => {
  test.fixme(true, 'The demo has no deterministic last-berth test fixture or server-side concurrent booking.');

  const firstPage = await browser.newPage();
  const secondPage = await browser.newPage();
  await Promise.all([openAvailableSleeperSeats(firstPage), openAvailableSleeperSeats(secondPage)]);
  await expect(firstPage.getByText(/seat no longer available/i)).toBeVisible();
  await secondPage.close();
});

test('blocks sold-out trains and offers waitlist or alternate suggestions', async ({ page }) => {
  test.fixme(true, 'The demo does not provide a sold-out train fixture or waitlist/alternate suggestions.');

  await searchTrains(page);
  await expect(page.getByText(/sold out/i)).toBeVisible();
  await expect(page.getByText(/waitlist|alternate train/i)).toBeVisible();
});
