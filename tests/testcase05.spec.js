import { test, expect } from '@playwright/test';

const appUrl = './';

async function submitLogin(page, username, password) {
  const captcha = (await page.locator('[aria-label="Captcha code"]').innerText()).trim();

  await page.getByRole('textbox', { name: 'User Name' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('textbox', { name: 'Captcha' }).fill(captcha);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('TC05-01: valid login lands on the intended page', async ({ page }) => {
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Log in' }).click();

  await submitLogin(page, 'safardemo', 'Safar@Train47');

  // Lands on the home page (a bare URL or #/), not on another step.
  await expect(page).toHaveURL(/\/(#\/)?$/);
  await expect(page.getByRole('heading', { name: /Happy Booking/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(page.getByText('Demo Traveller')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Signed in as safardemo');
});

test('TC05-02: invalid login gives the same generic error without identifying a field', async ({ page }) => {
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Log in' }).click();

  for (const [username, password] of [
    ['safardemo', 'wrong-password'],
    ['unregistered-user', 'AnyPassword47!'],
  ]) {
    await submitLogin(page, username, password);

    await expect(page.getByRole('alert')).toHaveText('Invalid user name or password.');
    await expect(page.getByRole('dialog', { name: 'LOGIN' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0);
  }
});
