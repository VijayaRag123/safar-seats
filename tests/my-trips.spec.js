import { test, expect } from '@playwright/test';
import { freezeClock, bookOneBerth, submitDemoLogin, searchTrains, openSeatMap } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await freezeClock(page);
});

test('My trips is only in the menu when logged in', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'My trips', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Log in' }).click();
  await submitDemoLogin(page);
  await expect(page.getByRole('button', { name: 'My trips', exact: true })).toBeVisible();
});

test('logged out, #/trips asks the visitor to log in', async ({ page }) => {
  await page.goto('./#/trips');
  await expect(page.getByTestId('trips-login')).toBeVisible();
});

test('a booked ticket links to My trips, where it is listed as upcoming', async ({ page }) => {
  await bookOneBerth(page);
  const pnr = await page.getByTestId('pnr').innerText();

  await page.getByRole('button', { name: 'View my trips' }).click();
  await expect(page).toHaveURL(/#\/trips$/);
  await expect(page.getByRole('tab', { name: 'Upcoming (1)' })).toBeVisible();
  await expect(page.getByTestId('trip-card')).toContainText(pnr);
  await expect(page.getByTestId('trip-status')).toHaveText('Confirmed');
});

test('cancelling more than 24 hours ahead refunds the full fare, not the service fee', async ({ page }) => {
  await bookOneBerth(page);
  await page.getByRole('button', { name: 'My trips', exact: true }).click();

  await page.getByTestId('cancel-btn').click();
  const box = page.getByTestId('cancel-box');
  await expect(box).toContainText('100% of the fare');
  await expect(box).toContainText('the service fee is not refunded');

  await page.getByTestId('cancel-confirm').click();
  await expect(page.getByRole('tab', { name: 'Upcoming (0)' })).toBeVisible();
  await page.getByRole('tab', { name: 'Cancelled (1)' }).click();
  await expect(page.getByTestId('trip-status')).toHaveText('Cancelled');
  await expect(page.getByTestId('trip-card')).toContainText('Refunded');
});

test('keeping a booking after opening the cancel box leaves it upcoming', async ({ page }) => {
  await bookOneBerth(page);
  await page.getByRole('button', { name: 'My trips', exact: true }).click();

  await page.getByTestId('cancel-btn').click();
  await page.getByRole('button', { name: 'Keep booking' }).click();
  await expect(page.getByTestId('cancel-box')).toHaveCount(0);
  await expect(page.getByTestId('trip-status')).toHaveText('Confirmed');
});

test('a booked berth is locked, and a cancelled berth can be booked again', async ({ page }) => {
  await bookOneBerth(page);
  const label = await page.locator('table td.mono').innerText(); // e.g. "S1/4 LB"
  const berth = label.split(' ')[0]; // "S1/4"

  const openSameMap = async () => {
    await searchTrains(page, { date: '2026-12-10' });
    await openSeatMap(page, 'SL');
    return page.getByRole('button', { name: new RegExp(`^Berth ${berth.replace('/', '\\/')},`) });
  };

  await expect(await openSameMap()).toBeDisabled();

  await page.getByRole('button', { name: 'My trips', exact: true }).click();
  await page.getByTestId('cancel-btn').click();
  await page.getByTestId('cancel-confirm').click();
  await expect(page.getByRole('tab', { name: 'Cancelled (1)' })).toBeVisible();

  await expect(await openSameMap()).toBeEnabled();
});
