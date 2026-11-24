import { test, expect } from '@playwright/test';
import { submitDemoLogin } from './helpers.js';

const eyeIcon = (button) => button.innerHTML();

test.describe('password show/hide button', () => {
  test('login: label and icon change together and the field type follows', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Log in' }).click();

    const eye = page.getByRole('button', { name: 'Show password' });
    const field = page.locator('#l-pass');
    const hiddenIcon = await eyeIcon(eye);
    await expect(field).toHaveAttribute('type', 'password');

    await eye.click();
    const shown = page.getByRole('button', { name: 'Hide password' });
    await expect(shown).toBeVisible();
    await expect(field).toHaveAttribute('type', 'text');
    expect(await eyeIcon(shown)).not.toBe(hiddenIcon);

    await shown.click();
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
    await expect(field).toHaveAttribute('type', 'password');
    expect(await eyeIcon(page.getByRole('button', { name: 'Show password' }))).toBe(hiddenIcon);
  });

  test('register: each field names its own button and toggling one leaves the other alone', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Register', exact: true }).click();

    const password = page.getByRole('button', { name: /^(Show|Hide) password$/ });
    const confirm = page.getByRole('button', { name: /^(Show|Hide) confirm password$/ });
    await expect(password).toHaveAccessibleName('Show password');
    await expect(confirm).toHaveAccessibleName('Show confirm password');

    await confirm.click();
    await expect(confirm).toHaveAccessibleName('Hide confirm password');
    await expect(page.locator('#r-pass2')).toHaveAttribute('type', 'text');
    await expect(password).toHaveAccessibleName('Show password');
    await expect(page.locator('#r-pass')).toHaveAttribute('type', 'password');

    await confirm.click();
    await expect(confirm).toHaveAccessibleName('Show confirm password');
  });

  test('login and register use the same icon for the same state', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Log in' }).click();
    const loginHidden = await eyeIcon(page.getByRole('button', { name: 'Show password' }));
    await page.getByRole('button', { name: 'Show password' }).click();
    const loginShown = await eyeIcon(page.getByRole('button', { name: 'Hide password' }));
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Register', exact: true }).click();
    expect(await eyeIcon(page.getByRole('button', { name: 'Show password' }))).toBe(loginHidden);
    expect(await eyeIcon(page.getByRole('button', { name: 'Show confirm password' }))).toBe(loginHidden);

    await page.getByRole('button', { name: 'Show password' }).click();
    expect(await eyeIcon(page.getByRole('button', { name: 'Hide password' }))).toBe(loginShown);
  });

  test('the password box can still be found by its name', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'Confirm Password' })).toHaveCount(1);
  });
});

test.describe('scope: train booking only', () => {
  test('there is no Agent login and the saved user has no role', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByRole('dialog', { name: 'LOGIN' })).toBeVisible();
    await expect(page.getByRole('button', { name: /agent/i })).toHaveCount(0);

    await submitDemoLogin(page);
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('safar_user')));
    expect(saved).not.toHaveProperty('role');
  });

  test('the home page offers trains only', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('button', { name: /bus/i })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/\bbuses?\b/i);
    await expect(page.getByRole('button', { name: 'Search trains' })).toBeVisible();
  });
});
