import { test, expect } from '@playwright/test';
import { freezeClock, searchTrains } from './helpers.js';

// Phones: 375 wide is the common iPhone size, 360 the common Android size.
const PHONES = [375, 360];
const CLASSES = ['SL', '3A', '2A', '1A', 'CC'];

for (const width of PHONES) {
  test.describe(`seat map at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await freezeClock(page);
    });

    for (const cls of CLASSES) {
      test(`${cls}: the map fits the screen and its text is readable`, async ({ page }) => {
        await searchTrains(page);
        const option = page.getByRole('button', { name: new RegExp(`^${cls} ₹.*Available`) }).first();
        test.skip((await option.count()) === 0, `no train with ${cls} seats available on the test date`);
        await option.click();
        await expect(page.getByRole('heading', { name: /Choose seats in/ })).toBeVisible();

        const m = await page.evaluate(() => {
          const scroller = document.querySelector('.decks') || document.querySelector('.chairs');
          const texts = [...document.querySelectorAll('.pr:not(.fare), .berthbtn, .seat, .seat small, .bay-no')]
            .filter((e) => e.offsetParent !== null)
            .map((e) => parseFloat(getComputedStyle(e).fontSize));
          return {
            mapScrollWidth: scroller.scrollWidth,
            mapClientWidth: scroller.clientWidth,
            pageOverflows: document.documentElement.scrollWidth > window.innerWidth,
            smallestFont: Math.min(...texts),
          };
        });

        expect(m.mapScrollWidth, 'map needs no sideways scrolling').toBeLessThanOrEqual(m.mapClientWidth + 1);
        expect(m.pageOverflows, 'page has no sideways scroll').toBe(false);
        expect(m.smallestFont, 'smallest map text in px').toBeGreaterThanOrEqual(11);
      });
    }

    test('the fare bar leaves most of the screen for the seat map', async ({ page }) => {
      await searchTrains(page);
      await page.getByRole('button', { name: /^SL ₹.*Available/ }).first().click();
      await page.getByRole('button', { name: /Auto-assign 1 berth/ }).click();

      const box = await page.getByTestId('summary').boundingBox();
      expect(box.height).toBeLessThan(800 * 0.3);
      // The hold timer, total and Continue button stay visible in the compact bar.
      await expect(page.getByTestId('hold-clock')).toBeVisible();
      await expect(page.getByTestId('total')).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue with 1 seat/ })).toBeVisible();
    });
  });
}

test.describe('berth map layout on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('side berths sit on their own line and show their tier', async ({ page }) => {
    await freezeClock(page);
    await searchTrains(page);
    await page.getByRole('button', { name: /^SL ₹.*Available/ }).first().click();

    const firstBay = page.locator('.brow:not(.bhead)').first();
    const main = await firstBay.locator('.grp:not(.side)').first().boundingBox();
    const side = await firstBay.locator('.grp.side').boundingBox();
    expect(side.y).toBeGreaterThan(main.y + main.height - 1); // below, not beside

    await expect(firstBay.locator('.grp.side .pr.tier').first()).toBeVisible();
    // The fare is stated once in the coach heading instead of under every berth.
    await expect(page.getByText(/₹[\d,]+ per berth/)).toBeVisible();
  });
});

test.describe('berth map layout on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('side berths stay beside the bay and the fare shows under each berth', async ({ page }) => {
    await freezeClock(page);
    await searchTrains(page);
    await page.getByRole('button', { name: /^SL ₹.*Available/ }).first().click();

    const firstBay = page.locator('.brow:not(.bhead)').first();
    const main = await firstBay.locator('.grp:not(.side)').first().boundingBox();
    const side = await firstBay.locator('.grp.side').boundingBox();
    expect(side.y).toBeLessThan(main.y + main.height); // same row

    await expect(firstBay.locator('.pr.fare').first()).toBeVisible();
    await expect(firstBay.locator('.pr.tier').first()).toBeHidden();
  });
});
