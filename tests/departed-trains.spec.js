import { test, expect } from '@playwright/test';
import { freezeClock } from './helpers.js';

const TODAY = '2026-12-01';

/** "06:15 AM" -> minutes after midnight */
function toMinutes(text) {
  const [, hh, mm, ap] = text.trim().match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
  return (Number(hh) % 12) * 60 + Number(mm) + (ap === 'PM' ? 720 : 0);
}

async function searchToday(page, nowIso) {
  await freezeClock(page, nowIso);
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Date' }).fill(TODAY);
  await page.getByRole('button', { name: 'Search trains' }).click();
}

test('searching today lists only trains that have not left yet', async ({ page }) => {
  await searchToday(page, `${TODAY}T12:00:00+05:30`);

  const departures = page.getByTestId('train-result').locator('.times b:first-child');
  await expect(departures.first()).toBeVisible();
  const times = (await departures.allInnerTexts()).map(toMinutes);

  expect(times.length).toBeGreaterThan(0);
  for (const t of times) expect(t).toBeGreaterThan(12 * 60);
});

test('an early search shows more trains than a late one', async ({ page }) => {
  await searchToday(page, `${TODAY}T00:30:00+05:30`);
  await expect(page.getByTestId('train-result').first()).toBeVisible();
  const early = await page.getByTestId('train-result').count();

  const late = await page.context().newPage();
  await searchToday(late, `${TODAY}T18:00:00+05:30`);
  const lateCount = await late.getByTestId('train-result').count();

  expect(early).toBeGreaterThan(lateCount);
});

test('when every train has gone the page says so', async ({ page }) => {
  await searchToday(page, `${TODAY}T23:59:00+05:30`);

  await expect(page.getByTestId('no-trains')).toContainText('All trains for today have already departed');
  await expect(page.getByTestId('train-result')).toHaveCount(0);
});

test('tomorrow is unaffected by the time of day', async ({ page }) => {
  await freezeClock(page, `${TODAY}T23:59:00+05:30`);
  await page.goto('./');
  await page.getByRole('button', { name: 'Search trains' }).click(); // the form defaults to tomorrow

  await expect(page.getByTestId('train-result').first()).toBeVisible();
  await expect(page.getByTestId('no-trains')).toHaveCount(0);
});
