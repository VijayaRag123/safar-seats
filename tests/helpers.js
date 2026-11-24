import { expect } from '@playwright/test';

/**
 * The sample trains, fares and seat availability are generated from the travel date,
 * so a test that depends on them must not depend on the day it runs.
 * freezeClock() starts the browser clock at a fixed moment (time keeps moving from there).
 */
export const FIXED_NOW = '2026-12-01T09:00:00+05:30';

export async function freezeClock(page, iso = FIXED_NOW) {
  await page.clock.install({ time: new Date(iso) });
}

export const DEMO_USER = { username: 'safardemo', password: 'Safar@Train47' };

/** Search Chennai -> Bengaluru (or other cities) and wait for the results. */
export async function searchTrains(page, { from = 'Chennai', to = 'Bengaluru', date, passengers } = {}) {
  await page.goto('./');
  await page.getByRole('combobox', { name: 'From' }).fill(from);
  await page.getByRole('combobox', { name: 'To' }).fill(to);
  if (date) await page.getByRole('textbox', { name: 'Date' }).fill(date);
  if (passengers) await page.getByRole('combobox', { name: 'Passengers' }).selectOption(String(passengers));
  await page.getByRole('button', { name: 'Search trains' }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
}

/** Open the seat map of the first train that has seats available in the given class. */
export async function openSeatMap(page, cls = 'SL') {
  const option = page.getByRole('button', { name: new RegExp(`^${cls} ₹.*Available`) }).first();
  await option.click();
  await expect(page.getByRole('heading', { name: /Choose seats in/ })).toBeVisible();
}

/** Log in from the open login dialog with the demo account. */
export async function submitDemoLogin(page) {
  const captcha = (await page.locator('[aria-label="Captcha code"]').innerText()).trim();
  await page.getByRole('textbox', { name: 'User Name' }).fill(DEMO_USER.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(DEMO_USER.password);
  await page.getByRole('textbox', { name: 'Captcha' }).fill(captcha);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function fillPassenger(page, { name = 'Test Rider', age = '30', gender = 'Male' } = {}) {
  await page.getByRole('textbox', { name: 'Full name' }).first().fill(name);
  await page.getByRole('textbox', { name: 'Age' }).first().fill(age);
  await page.getByRole('combobox', { name: 'Gender' }).first().selectOption(gender);
  await page.getByRole('textbox', { name: 'Mobile number' }).fill('9876543210');
  await page.getByRole('textbox', { name: 'Email' }).fill('rider@example.com');
}

/**
 * Book one sleeper berth, logging in on the way, and stop on the ticket page.
 * The travel date is far enough ahead for a full refund when cancelled.
 */
export async function bookOneBerth(page, { date = '2026-12-10' } = {}) {
  await searchTrains(page, { date });
  await openSeatMap(page, 'SL');
  await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();
  await page.getByRole('button', { name: /Continue with 1 seat/ }).click();
  await fillPassenger(page);
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await submitDemoLogin(page);
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page.getByTestId('booking-status')).toHaveText('Booking confirmed');
}

/** Open the login dialog from the menu and sign in with the demo account. */
export async function loginDemo(page) {
  await page.getByRole('button', { name: 'Log in' }).click();
  await submitDemoLogin(page);
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}

/** Search, pick sleeper seats automatically and stop on the passenger details step. */
export async function goToPassengerStep(page, { passengers = 1 } = {}) {
  await searchTrains(page, { passengers });
  await openSeatMap(page, 'SL');
  await page.getByRole('button', { name: /Auto-assign \d berths?/ }).click();
  await page.getByRole('button', { name: /Continue with \d seats?/ }).click();
  await expect(page.getByRole('heading', { name: 'Passenger details' })).toBeVisible();
}

/** From the passenger step: continue, log in if asked, pay, and wait for the ticket. */
export async function payFromPassengerStep(page) {
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  const login = page.getByRole('dialog', { name: 'LOGIN' });
  if (await login.isVisible()) await submitDemoLogin(page);
  await page.getByRole('button', { name: /^Pay / }).click();
  await expect(page.getByTestId('booking-status')).toHaveText('Booking confirmed');
}

/** Add a person on the Saved passengers page (opens the page from the menu). */
export async function addSavedPassenger(page, { name, age, gender }) {
  await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill(name);
  await page.getByRole('textbox', { name: 'Age' }).fill(String(age));
  await page.getByRole('combobox', { name: 'Gender' }).selectOption(gender);
  await page.getByRole('button', { name: 'Add passenger' }).click();
  await expect(page.getByTestId('saved-pax').filter({ hasText: name })).toBeVisible();
}
