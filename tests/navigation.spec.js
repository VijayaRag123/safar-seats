import { test, expect } from '@playwright/test';
import { freezeClock, searchTrains, openSeatMap, fillPassenger, bookOneBerth } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freezeClock(page);
});

const holdSeconds = async (page) => {
  const [m, s] = (await page.getByTestId('hold-clock').innerText()).split(':').map(Number);
  return m * 60 + s;
};

test('each booking step has its own URL', async ({ page }) => {
  await searchTrains(page);
  await expect(page).toHaveURL(/#\/results$/);

  await openSeatMap(page, 'SL');
  await expect(page).toHaveURL(/#\/seats$/);

  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();
  await expect(page).toHaveURL(/#\/passengers$/);
});

test('browser Back and Forward move between steps and keep the chosen seat', async ({ page }) => {
  await searchTrains(page);
  await openSeatMap(page, 'SL');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  const chosen = await page.locator('[data-testid^="chosen-"]').innerText();

  await page.goBack();
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.getByRole('article').first()).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/#\/seats$/);
  await expect(page.locator('[data-testid^="chosen-"]')).toHaveText(chosen);
});

test('Back from the first step does not leave the site mid-flow', async ({ page }) => {
  await searchTrains(page);
  await page.goBack();
  // Back from results returns to the search page, not to about:blank.
  await expect(page).toHaveURL(/\/(#\/)?$/);
  await expect(page.getByRole('heading', { name: /Happy Booking/ })).toBeVisible();
});

test('reload keeps the results', async ({ page }) => {
  await searchTrains(page, { from: 'Chennai', to: 'Madurai' });
  const firstTrain = await page.getByRole('article').first().getByRole('heading').innerText();

  await page.reload();
  await expect(page).toHaveURL(/#\/results$/);
  await expect(page.getByText(/Chennai → Madurai/)).toBeVisible();
  await expect(page.getByRole('article').first().getByRole('heading')).toHaveText(firstTrain);
});

test('reload keeps the chosen seat and the hold timer keeps counting down', async ({ page }) => {
  await searchTrains(page);
  await openSeatMap(page, 'SL');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  const chosen = await page.locator('[data-testid^="chosen-"]').innerText();

  await page.waitForTimeout(2500);
  const before = await holdSeconds(page);
  expect(before).toBeLessThan(600); // the clock is already running

  await page.reload();
  await expect(page).toHaveURL(/#\/seats$/);
  await expect(page.locator('[data-testid^="chosen-"]')).toHaveText(chosen);

  // A reset would show 10:00 again. The timer must continue from where it was.
  const after = await holdSeconds(page);
  expect(after).toBeLessThanOrEqual(before);
  expect(after).toBeGreaterThan(0);
});

test('reload keeps passenger details', async ({ page }) => {
  await searchTrains(page);
  await openSeatMap(page, 'SL');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();
  await fillPassenger(page, { name: 'Asha Raman', age: '41', gender: 'Female' });

  await page.reload();
  await expect(page).toHaveURL(/#\/passengers$/);
  await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveValue('Asha Raman');
  await expect(page.getByRole('textbox', { name: 'Age' })).toHaveValue('41');
  await expect(page.getByRole('combobox', { name: 'Gender' })).toHaveValue('Female');
  await expect(page.getByRole('textbox', { name: 'Mobile number' })).toHaveValue('9876543210');
});

test('a step cannot be opened before the earlier steps are done', async ({ page }) => {
  await page.goto('./');

  for (const step of ['seats', 'passengers', 'payment', 'ticket', 'results']) {
    await page.goto(`./#/${step}`);
    await expect(page.getByRole('heading', { name: /Happy Booking/ }), `#/${step} falls back to home`).toBeVisible();
    await expect(page).toHaveURL(/\/(#\/)?$/);
  }

  await page.goto('./#/not-a-page');
  await expect(page.getByRole('heading', { name: /Happy Booking/ })).toBeVisible();
});

test('payment cannot be reached by URL while logged out', async ({ page }) => {
  await searchTrains(page);
  await openSeatMap(page, 'SL');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();
  await fillPassenger(page);

  await page.evaluate(() => { location.hash = '#/payment'; });
  await expect(page).toHaveURL(/#\/passengers$/);
});

test('Back from the ticket does not reopen payment', async ({ page }) => {
  await bookOneBerth(page);
  await expect(page).toHaveURL(/#\/ticket$/);

  await page.goBack();
  await expect(page).not.toHaveURL(/#\/(payment|passengers)$/);
  await expect(page.getByRole('button', { name: /^Pay / })).toHaveCount(0);
});

test('the ticket survives a reload', async ({ page }) => {
  await bookOneBerth(page);
  const pnr = await page.getByTestId('pnr').innerText();

  await page.reload();
  await expect(page).toHaveURL(/#\/ticket$/);
  await expect(page.getByTestId('pnr')).toHaveText(pnr);
});
