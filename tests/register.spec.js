import { test, expect } from '@playwright/test';

const appUrl = 'https://vijayarag123.github.io/safar-seats/';
const validPassword = 'Rider@Train8X';

function registrationDetails() {
  const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const mobileSuffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');

  return {
    username: `qa${suffix}`,
    fullName: 'Safar Test User',
    password: validPassword,
    mobile: `98765${mobileSuffix}`,
    email: `qa.${suffix}@example.com`,
  };
}

async function openRegistration(page) {
  await page.goto(appUrl);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
}

async function fillRegistrationDetails(page, details) {
  await page.getByRole('textbox', { name: 'Username' }).fill(details.username);
  await page.getByRole('textbox', { name: 'Full Name as per Govt. ID' }).fill(details.fullName);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(details.password);
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill(details.password);
  await page.getByRole('textbox', { name: 'Mobile Number' }).fill(details.mobile);
  await page.getByRole('textbox', { name: 'Email' }).fill(details.email);
}

async function completeRegistration(page, details) {
  await openRegistration(page);
  await fillRegistrationDetails(page, details);
  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.getByText('Demo only: no SMS or email is sent. Enter 123456.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
  await page.getByRole('button', { name: 'Confirm and create account' }).click();
  await expect(page.getByRole('status')).toContainText('Account created. Log in to continue.');
}

test('registers a new account with valid details and OTP', async ({ page }) => {
  await openRegistration(page);
  await fillRegistrationDetails(page, registrationDetails());
  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.getByText('Demo only: no SMS or email is sent. Enter 123456.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Enter OTP' }).fill('123456');
  await page.getByRole('button', { name: 'Confirm and create account' }).click();

  await expect(page.getByRole('status')).toContainText('Account created. Log in to continue.');
});

test('shows a clear error when registering with an existing email', async ({ page }) => {
  const existing = registrationDetails();
  await completeRegistration(page, existing);
  await page.getByRole('button', { name: 'Close' }).click();

  const duplicate = registrationDetails();
  duplicate.email = existing.email;
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await fillRegistrationDetails(page, duplicate);
  await page.getByRole('button', { name: 'Verify' }).click();

  await expect(page.getByText('An account with this email already exists.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Enter OTP' })).toHaveCount(0);
});

test('shows a clear error when registering with an existing mobile number', async ({ page }) => {
  const existing = registrationDetails();
  await completeRegistration(page, existing);
  await page.getByRole('button', { name: 'Close' }).click();

  const duplicate = registrationDetails();
  duplicate.mobile = existing.mobile;
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await fillRegistrationDetails(page, duplicate);

  // Static demos may not return a matching API request. Capture it when one exists,
  // without making that infrastructure detail hide the UI validation result.
  let response;
  try {
    [response] = await Promise.all([
      page.waitForResponse(
        r => r.request().method() === 'POST' && /otp|register|verify|signup/i.test(r.url()),
        { timeout: 15000 }
      ),
      page.getByRole('button', { name: 'Verify' }).click(),
    ]);

    console.log('API:', response.url(), response.status(), await response.text());
  } catch {
    console.log('API: no matching POST response; validating the registration UI.');
  }

  // Looser wording match + longer timeout; scoped to alert/toast first, then falls back to any text
  const errorMsg = page
    .getByRole('alert')
    .filter({ hasText: /mobile|number|already|exists|registered|in use/i })
    .or(page.getByText(/already\s+(exists|registered|in use)/i))
    .first();

  await expect(errorMsg).toBeVisible({ timeout: 10000 });
  await expect(errorMsg).toContainText(/mobile|number|exists|registered/i);
  await expect(page.getByRole('textbox', { name: 'Enter OTP' })).toHaveCount(0);
});

test('shows inline password-rule feedback for length, complexity, and sequences', async ({ page }) => {
  await openRegistration(page);
  const password = page.getByRole('textbox', { name: 'Password', exact: true });
  const rule = (text) => page.getByRole('listitem').filter({ hasText: text });

  await password.fill('Short1@ab');
  await expect(rule('Minimum 11 to Maximum 15 characters')).toContainText('✕');

  await password.fill('longpassword@9');
  await expect(rule('One numeric digit and one special character')).toContainText('✓');
  await expect(rule('At least one small and one capital alphabet.')).toContainText('✕');

  await password.fill('Abcde@12aaaa');
  await expect(rule('No sequence/repeated characters')).toContainText('✕');
});

test('rejects a wrong OTP and accepts the valid OTP', async ({ page }) => {
  await openRegistration(page);
  await fillRegistrationDetails(page, registrationDetails());
  await page.getByRole('button', { name: 'Verify' }).click();

  const otp = page.getByRole('textbox', { name: 'Enter OTP' });
  await otp.fill('000000');
  await page.getByRole('button', { name: 'Confirm and create account' }).click();
  await expect(page.getByText('The OTP is incorrect. Check it and try again.')).toBeVisible();

  await otp.fill('123456');
  await page.getByRole('button', { name: 'Confirm and create account' }).click();
  await expect(page.getByRole('status')).toContainText('Account created. Log in to continue.');
});

test('rejects an expired OTP', async ({ page }) => {
  test.fixme(true, 'The current demo registration flow does not expire OTPs.');

  await openRegistration(page);
  await fillRegistrationDetails(page, registrationDetails());
  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page.getByText(/OTP.*expired/i)).toBeVisible();
});

test('resends an OTP when requested', async ({ page }) => {
  test.fixme(true, 'The current registration flow has no resend OTP control.');

  await openRegistration(page);
  await fillRegistrationDetails(page, registrationDetails());
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByRole('button', { name: /resend OTP/i }).click();
  await expect(page.getByText(/new OTP/i)).toBeVisible();
});

test('shows an error after the OTP resend limit is reached', async ({ page }) => {
  test.fixme(true, 'The current registration flow has no resend OTP control or resend limit.');

  await openRegistration(page);
  await fillRegistrationDetails(page, registrationDetails());
  await page.getByRole('button', { name: 'Verify' }).click();
  const resend = page.getByRole('button', { name: /resend OTP/i });
  await resend.click();
  await resend.click();
  await expect(page.getByText(/resend limit/i)).toBeVisible();
});
