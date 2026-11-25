import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const appUrl = 'http://127.0.0.1:4173/';
const availabilityFixtures = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'test-data', 'availability-fixtures.json'), 'utf8'),
);

async function fillStation(page, testId, station) {
  const input = page.getByTestId(testId);
  await input.fill(station);
  return input;
}

async function searchTrains(page, { from = 'Chennai', to = 'Bengaluru' } = {}) {
  await fillStation(page, 'search-from', from);
  await fillStation(page, 'search-to', to);
  await page.getByTestId('search-btn').click();
  await expect(page.getByTestId('results'), 'A train search must navigate to results').toBeVisible();
}

test.describe('Train search scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(appUrl);
  });

  test('TRN-NEG-01: same source and destination', { tag: '@regression' }, async ({ page }) => {
    await fillStation(page, 'search-from', 'Chennai');
    await fillStation(page, 'search-to', 'Chennai');
    await page.getByTestId('search-btn').click();

    await expect(
      page.getByTestId('search-error'),
      'A same-city route must show a clear validation error',
    ).toHaveText('From and To must be different cities.');
    await expect(page.getByTestId('results'), 'A same-city route must not submit').toHaveCount(0);
  });

  test('TRN-NEG-02: past date', { tag: '@regression' }, async ({ page }) => {
    const date = page.getByTestId('search-date');
    await expect(date, 'The date picker must disable dates before today').toHaveAttribute(
      'min',
      /^\d{4}-\d{2}-\d{2}$/,
    );

    await date.fill('2020-01-01');
    await page.getByTestId('search-btn').click();
    await expect(
      page.getByTestId('search-error'),
      'A manually entered past date must be rejected',
    ).toHaveText('Pick today or a later date.');
  });

  test('TRN-01: keyboard station autocomplete', { tag: '@smoke' }, async ({ page }) => {
    const from = page.getByTestId('search-from');
    await from.fill('Che');
    await from.press('ArrowDown');
    await from.press('Enter');

    await page.getByTestId('modify-search').click();
    await expect(page.getByTestId('search-from'), 'ArrowDown and Enter must select a station').toHaveValue('Chennai');
  });

  test('TRN-02: class selection and fare', { tag: '@regression' }, async ({ page }) => {
    await searchTrains(page);

    const classes = page.locator('[data-testid^="class-"]');
    await expect(classes.first(), 'Search results must offer at least one train class').toBeVisible();

    const seenClasses = new Set();
    for (let index = 0; index < await classes.count(); index += 1) {
      const option = classes.nth(index);
      const testId = await option.getAttribute('data-testid');
      const classCode = testId?.split('-').at(-1);
      if (!classCode || seenClasses.has(classCode)) continue;

      seenClasses.add(classCode);
      await expect(option, `${classCode} fare must be displayed`).toContainText(/₹[\d,]+/);
      await expect(option, `${classCode} availability must be displayed`).toContainText(
        /(Available \d+|RAC \d+|WL \d+)/,
      );

      const text = await option.innerText();
      const fare = text.match(/₹([\d,]+)/)?.[1];
      expect(Number(fare?.replaceAll(',', '')), `${classCode} fare must not be zero`).toBeGreaterThan(0);

      await option.click();
      await expect(
        page.getByRole('heading', { name: /Choose seats in|Passenger details/ }),
        `Selecting ${classCode} must open booking details`,
      ).toBeVisible();
      await page.getByRole('button', { name: '← Back to results' }).click();
    }

    expect(seenClasses.size, 'The results must include at least one offered class').toBeGreaterThan(0);
  });

  test('TRN-03: availability statuses', { tag: '@regression' }, async ({ page }) => {
    await page.route(/\/api\/train-search(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trains: [
            {
              classes: Object.values(availabilityFixtures).filter(
                (fixture) => fixture.status,
              ),
            },
          ],
        }),
      });
    });

    await searchTrains(page);

    for (const [name, fixture] of Object.entries({
      available: availabilityFixtures.available,
      rac: availabilityFixtures.rac,
      waitlist: availabilityFixtures.waitlist,
    })) {
      await expect(
        page.getByRole('button', { name: new RegExp(`${fixture.status === 'AVAILABLE' ? 'Available' : fixture.status} ${fixture.count}`) }).first(),
        `The ${name} fixture status must render with its count`,
      ).toBeVisible();
    }
  });

  test('TRN-03: regret availability disables booking', { tag: '@regression' }, async ({ page }) => {
    await page.route(/\/api\/train-search(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(availabilityFixtures.soldOut),
      });
    });

    await searchTrains(page);
    const regret = page.getByRole('button', { name: /Regret/i }).first();

    await expect(regret, 'A Regret class must render').toBeVisible();
    await expect(regret, 'Regret must not be bookable').toBeDisabled();
  });

  test('TRN-12: no trains and sold out', { tag: '@smoke' }, async ({ page }) => {
    await page.route(/\/api\/train-search(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(availabilityFixtures.noTrains),
      });
    });

    await searchTrains(page);
    await expect(
      page.getByText(/No trains found/i).first(),
      'A no-trains response must show the helpful empty state',
    ).toBeVisible();

    await page.unroute(/\/api\/train-search(?:\?.*)?$/);
    await page.route(/\/api\/train-search(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(availabilityFixtures.soldOut),
      });
    });

    await page.getByTestId('modify-search').click();
    await fillStation(page, 'search-from', 'Chennai');
    await fillStation(page, 'search-to', 'Tirupati');
    await page.getByTestId('search-btn').click();

    const soldOutClass = page.getByRole('button', { name: /Regret|Sold out/i }).first();
    await expect(soldOutClass, 'A sold-out train must render its unavailable status').toBeVisible();
    await expect(soldOutClass, 'A sold-out train must not be bookable').toBeDisabled();
  });
});
