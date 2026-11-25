import { test, expect } from '@playwright/test';
import {
  freezeClock, loginDemo, goToPassengerStep, payFromPassengerStep, addSavedPassenger, fillPassenger,
} from './helpers.js';

const DEMO_EMAIL = 'demo@safarseats.example';

test.beforeEach(async ({ page }) => {
  await freezeClock(page);
});

const savedRows = (page) => page.getByTestId('saved-pax');

test.describe('saving a passenger while booking', () => {
  test('nothing is stored unless the Save box is ticked', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await goToPassengerStep(page);

    const box = page.getByRole('checkbox', { name: /Save to my passengers/ });
    await expect(box).not.toBeChecked();

    await fillPassenger(page, { name: 'Rohan Iyer', age: '35', gender: 'Male' });
    await payFromPassengerStep(page);

    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
    await expect(page.getByTestId('saved-empty')).toBeVisible();
  });

  test('a ticked passenger is saved after the booking and listed on the Saved passengers page', async ({ page }) => {
    await goToPassengerStep(page); // logged out: the account is only needed at payment
    await fillPassenger(page, { name: 'Rohan Iyer', age: '35', gender: 'Male' });
    await page.getByRole('checkbox', { name: /Save to my passengers/ }).check();
    await payFromPassengerStep(page);

    await expect(page.locator('#toast')).toContainText('Saved 1 passenger to your account.');

    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
    await expect(page).toHaveURL(/#\/saved$/);
    await expect(savedRows(page)).toHaveCount(1);
    await expect(savedRows(page)).toContainText('Rohan Iyer');
    await expect(savedRows(page)).toContainText('35 · Male');
  });

  test('a passenger is not saved when the payment fails', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await goToPassengerStep(page);
    await fillPassenger(page, { name: 'Rohan Iyer', age: '35', gender: 'Male' });
    await page.getByRole('checkbox', { name: /Save to my passengers/ }).check();

    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.getByTestId('pay-outcome').selectOption('failure');
    await page.getByRole('button', { name: /^Pay / }).click();
    await expect(page.getByTestId('pay-error')).toBeVisible();

    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
    await expect(page.getByTestId('saved-empty')).toBeVisible();
  });

  test('saving the same person again updates the age instead of adding a duplicate', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Asha Raman', age: 41, gender: 'Female' });

    await goToPassengerStep(page);
    await fillPassenger(page, { name: 'asha raman', age: '42', gender: 'Female' });
    await page.getByRole('checkbox', { name: /Save to my passengers/ }).check();
    await payFromPassengerStep(page);

    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
    await expect(savedRows(page)).toHaveCount(1);
    await expect(savedRows(page)).toContainText('42 · Female');
  });
});

test.describe('using saved passengers in a booking', () => {
  test('logged out, the page offers to log in, and logging in reveals the saved passengers', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Asha Raman', age: 41, gender: 'Female' });
    await page.getByTestId('logout-btn').click();

    await goToPassengerStep(page);
    await expect(page.getByTestId('saved-hint')).toBeVisible();
    await expect(page.getByTestId('psaved-0')).toHaveCount(0);

    await page.getByTestId('saved-hint').getByRole('button', { name: 'Log in' }).click();
    await (await import('./helpers.js')).submitDemoLogin(page);
    await expect(page.getByTestId('psaved-0')).toBeVisible();
    await expect(page.getByTestId('saved-hint')).toHaveCount(0);
  });

  test('choosing a saved passenger fills in the details', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Asha Raman', age: 41, gender: 'Female' });

    await goToPassengerStep(page);
    await page.getByTestId('psaved-0').selectOption({ label: 'Asha Raman · 41 · Female' });

    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveValue('Asha Raman');
    await expect(page.getByRole('textbox', { name: 'Age' })).toHaveValue('41');
    await expect(page.getByRole('combobox', { name: 'Gender' })).toHaveValue('Female');
    // Already saved, so there is no Save box to tick.
    await expect(page.getByTestId('psaved-tag-0')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Save to my passengers/ })).toHaveCount(0);
  });

  test('a booking made with saved passengers shows them on the ticket', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Asha Raman', age: 41, gender: 'Female' });

    await goToPassengerStep(page);
    await page.getByTestId('psaved-0').selectOption({ label: 'Asha Raman · 41 · Female' });
    await page.getByRole('textbox', { name: 'Mobile number' }).fill('9876543210');
    await page.getByRole('textbox', { name: 'Email' }).fill('asha@example.com');
    await payFromPassengerStep(page);

    await expect(page.getByRole('table')).toContainText('Asha Raman');
    await expect(page.getByRole('table')).toContainText('41 / F');
  });

  test('in a two-passenger booking a person already added cannot be picked twice', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Asha Raman', age: 41, gender: 'Female' });
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    await goToPassengerStep(page, { passengers: 2 });
    await page.getByTestId('psaved-0').selectOption({ label: 'Asha Raman · 41 · Female' });

    const second = page.getByTestId('psaved-1');
    await expect(second.getByRole('option', { name: /Asha Raman/ })).toBeDisabled();
    await expect(second.getByRole('option', { name: /Rohan Iyer/ })).toBeEnabled();

    await second.selectOption({ label: 'Rohan Iyer · 35 · Male' });
    await expect(page.getByRole('textbox', { name: 'Full name' }).nth(1)).toHaveValue('Rohan Iyer');

    await page.getByRole('textbox', { name: 'Mobile number' }).fill('9876543210');
    await page.getByRole('textbox', { name: 'Email' }).fill('asha@example.com');
    await payFromPassengerStep(page);
    await expect(page.getByRole('table')).toContainText('Asha Raman');
    await expect(page.getByRole('table')).toContainText('Rohan Iyer');
  });

  test('the booking page links to the Saved passengers page and back keeps the booking', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Asha Raman', age: 41, gender: 'Female' });

    await goToPassengerStep(page);
    await page.getByRole('textbox', { name: 'Full name' }).fill('Typed Name');
    await page.getByTestId('manage-saved').click();
    await expect(page).toHaveURL(/#\/saved$/);

    await page.goBack();
    await expect(page).toHaveURL(/#\/passengers$/);
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveValue('Typed Name');
  });
});

test.describe('Saved passengers page', () => {
  test('logged out, it asks the visitor to log in', async ({ page }) => {
    await page.goto('./#/saved');
    await expect(page.getByTestId('saved-login')).toBeVisible();
  });

  test('Saved passengers is in the menu only when logged in', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Saved passengers', exact: true })).toHaveCount(0);
    await loginDemo(page);
    await expect(page.getByRole('button', { name: 'Saved passengers', exact: true })).toBeVisible();
  });

  test('adding a passenger checks the details first', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();

    await page.getByRole('button', { name: 'Add passenger' }).click();
    await expect(page.getByText('Enter the name using letters only, 2 to 40 characters.')).toBeVisible();
    await expect(page.getByText('Enter an age between 1 and 120.')).toBeVisible();
    await expect(page.getByText('Select a gender.')).toBeVisible();
    await expect(page.getByTestId('saved-empty')).toBeVisible();

    await page.getByRole('textbox', { name: 'Full name' }).fill('Rohan Iyer');
    await page.getByRole('textbox', { name: 'Age' }).fill('121');
    await page.getByRole('combobox', { name: 'Gender' }).selectOption('Male');
    await page.getByRole('button', { name: 'Add passenger' }).click();
    await expect(page.getByText('Enter an age between 1 and 120.')).toBeVisible();

    await page.getByRole('textbox', { name: 'Age' }).fill('35');
    await page.getByRole('button', { name: 'Add passenger' }).click();
    await expect(savedRows(page)).toHaveCount(1);
    await expect(page.locator('#toast')).toContainText('Saved Rohan Iyer.');
    // The form is cleared for the next person.
    await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveValue('');
  });

  test('the same person cannot be added twice', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    await page.getByRole('textbox', { name: 'Full name' }).fill('rohan iyer');
    await page.getByRole('textbox', { name: 'Age' }).fill('36');
    await page.getByRole('combobox', { name: 'Gender' }).selectOption('Male');
    await page.getByRole('button', { name: 'Add passenger' }).click();

    await expect(page.getByText('This passenger is already saved.')).toBeVisible();
    await expect(savedRows(page)).toHaveCount(1);
  });

  test('a saved passenger can be edited, and editing can be cancelled', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    await page.getByRole('button', { name: 'Edit Rohan Iyer' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Rohan Iyer' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Age' })).toHaveValue('35');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add a passenger' })).toBeVisible();
    await expect(savedRows(page)).toContainText('35 · Male');

    await page.getByRole('button', { name: 'Edit Rohan Iyer' }).click();
    await page.getByRole('textbox', { name: 'Age' }).fill('36');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(savedRows(page)).toHaveCount(1);
    await expect(savedRows(page)).toContainText('36 · Male');
    await expect(page.locator('#toast')).toContainText('Updated Rohan Iyer.');
  });

  test('deleting asks first, and Keep leaves the passenger in place', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    await page.getByRole('button', { name: 'Delete Rohan Iyer' }).click();
    await expect(page.getByTestId('saved-del-box')).toContainText('Tickets you already booked are not changed');
    await page.getByRole('button', { name: 'Keep' }).click();
    await expect(page.getByTestId('saved-del-box')).toHaveCount(0);
    await expect(savedRows(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Delete Rohan Iyer' }).click();
    await page.getByTestId('saved-del-confirm').click();
    await expect(savedRows(page)).toHaveCount(0);
    await expect(page.getByTestId('saved-empty')).toBeVisible();
  });

  test('removing a saved passenger does not change a ticket already booked', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    await goToPassengerStep(page);
    await page.getByTestId('psaved-0').selectOption({ label: 'Rohan Iyer · 35 · Male' });
    await page.getByRole('textbox', { name: 'Mobile number' }).fill('9876543210');
    await page.getByRole('textbox', { name: 'Email' }).fill('rohan@example.com');
    await payFromPassengerStep(page);

    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
    await page.getByRole('button', { name: 'Delete Rohan Iyer' }).click();
    await page.getByTestId('saved-del-confirm').click();

    await page.getByRole('button', { name: 'My trips', exact: true }).click();
    await expect(page.getByTestId('trip-card')).toContainText('Rohan Iyer');
  });
});

test.describe('where the list lives', () => {
  test('it survives a reload and logging out and in again', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    await page.reload();
    await expect(page).toHaveURL(/#\/saved$/);
    await expect(savedRows(page)).toContainText('Rohan Iyer');

    await page.getByTestId('logout-btn').click();
    await expect(page.getByTestId('saved-login')).toBeVisible(); // nothing is shown to a logged-out visitor
    await expect(page.getByText('Rohan Iyer')).toHaveCount(0);

    await page.getByTestId('saved-login').getByRole('button', { name: 'Log in' }).click();
    await (await import('./helpers.js')).submitDemoLogin(page);
    await expect(savedRows(page)).toContainText('Rohan Iyer');
  });

  test('each account sees only its own passengers', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => {
      localStorage.setItem('safar_saved_pax', JSON.stringify({
        'someone.else@example.com': [{ id: 'spx1', name: 'Secret Person', age: 50, gender: 'Other' }],
      }));
    });
    await loginDemo(page);
    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();

    await expect(page.getByTestId('saved-empty')).toBeVisible();
    await expect(page.getByText('Secret Person')).toHaveCount(0);

    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('safar_saved_pax')));
    expect(Object.keys(stored).sort()).toEqual([DEMO_EMAIL, 'someone.else@example.com']);
    expect(stored['someone.else@example.com']).toHaveLength(1); // the other account is untouched
  });

  test('the list holds up to 20 people', async ({ page }) => {
    await page.goto('./');
    await page.evaluate((email) => {
      const people = Array.from({ length: 20 }, (_, i) => ({
        id: `sp${i}`, name: `Person ${String.fromCharCode(65 + i)}`, age: 30, gender: 'Other',
      }));
      localStorage.setItem('safar_saved_pax', JSON.stringify({ [email]: people }));
    }, DEMO_EMAIL);
    await loginDemo(page);

    await page.getByRole('button', { name: 'Saved passengers', exact: true }).click();
    await expect(savedRows(page)).toHaveCount(20);
    await expect(page.getByTestId('saved-full')).toContainText('up to 20');
    await expect(page.getByRole('button', { name: 'Add passenger' })).toBeDisabled();

    // Booking still works; the new person just is not added to the full list.
    await goToPassengerStep(page);
    await fillPassenger(page, { name: 'Rohan Iyer', age: '35', gender: 'Male' });
    await page.getByRole('checkbox', { name: /Save to my passengers/ }).check();
    await payFromPassengerStep(page);
    await expect(page.locator('#toast')).toContainText('saved passengers list is full');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('the menu and the Saved passengers page fit a 375px screen', async ({ page }) => {
    await page.goto('./');
    await loginDemo(page);
    await addSavedPassenger(page, { name: 'Rohan Iyer', age: 35, gender: 'Male' });

    const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(await overflows(), 'saved passengers page').toBe(false);

    await goToPassengerStep(page);
    expect(await overflows(), 'passenger step with the saved-passenger picker').toBe(false);
    await expect(page.getByTestId('psaved-0')).toBeVisible();
  });
});
